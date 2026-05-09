# ─────────────────────────────────────────────────────────────────────────────
# main.tf
# MongoDB Atlas infrastructure via Terraform
#
# Resources created:
#   1. Atlas Project
#   2. Atlas Cluster (M0 free tier by default)
#   3. Database User
#   4. IP Access List (whitelist)
# ─────────────────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.3.0"

  required_providers {
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.14.0"
    }
  }
}

# ── Provider ──────────────────────────────────────────────────────────────────
provider "mongodbatlas" {
  public_key  = var.mongodbatlas_public_key
  private_key = var.mongodbatlas_private_key
}

# ─────────────────────────────────────────────────────────────────────────────
# 1. Atlas Project
# ─────────────────────────────────────────────────────────────────────────────
resource "mongodbatlas_project" "this" {
  name   = var.project_name
  org_id = var.atlas_org_id
}

# ─────────────────────────────────────────────────────────────────────────────
# 2. Atlas Cluster
# ─────────────────────────────────────────────────────────────────────────────
resource "mongodbatlas_cluster" "this" {
  project_id = mongodbatlas_project.this.id
  name       = var.cluster_name

  # Cluster tier
  # M0 = free shared | M10+ = dedicated (paid)
  provider_instance_size_name = var.cluster_tier

  # Cloud provider & region
  provider_name               = var.cluster_tier == "M0" ? "TENANT" : var.cloud_provider
  backing_provider_name       = var.cluster_tier == "M0" ? var.cloud_provider : null
  provider_region_name        = var.region

  # MongoDB version
  mongo_db_major_version = var.mongo_db_major_version

  # Auto-scaling (disabled for free tier)
  auto_scaling_disk_gb_enabled = var.cluster_tier == "M0" ? false : true

  # Backup (not available on free tier)
  cloud_backup = var.cluster_tier == "M0" ? false : true

  labels {
    key   = "environment"
    value = "development"
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# 3. Database User
# ─────────────────────────────────────────────────────────────────────────────
resource "mongodbatlas_database_user" "app_user" {
  project_id         = mongodbatlas_project.this.id
  username           = var.db_username
  password           = var.db_password
  auth_database_name = "admin"  # authentication database

  roles {
    role_name     = var.db_role
    database_name = "admin"
  }

  # Optional: scope access to specific clusters only
  scopes {
    name = mongodbatlas_cluster.this.name
    type = "CLUSTER"
  }

  labels {
    key   = "created-by"
    value = "terraform"
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# 4. IP Access List (Whitelist)
# ─────────────────────────────────────────────────────────────────────────────
resource "mongodbatlas_project_ip_access_list" "allowed_ips" {
  for_each = {
    for idx, ip in var.allowed_ip_addresses :
    idx => ip
  }

  project_id = mongodbatlas_project.this.id
  cidr_block = each.value.cidr_block
  comment    = each.value.comment
}
