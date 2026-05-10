# ─────────────────────────────────────────────────────────────────────────────
# variables.tf
# All configurable inputs for the MongoDB Atlas Terraform setup.
# Values are supplied via terraform.tfvars (never commit that file).
# ─────────────────────────────────────────────────────────────────────────────

# ── Atlas API credentials ─────────────────────────────────────────────────────
# Generate at: https://cloud.mongodb.com → Access Manager → API Keys
variable "mongodbatlas_public_key" {
  description = "MongoDB Atlas API public key"
  type        = string
  sensitive   = false
}

variable "mongodbatlas_private_key" {
  description = "MongoDB Atlas API private key"
  type        = string
  sensitive   = false
}

# ── Project ───────────────────────────────────────────────────────────────────
variable "atlas_org_id" {
  description = "MongoDB Atlas Organization ID (found in Atlas UI → Settings)"
  type        = string
}

variable "project_name" {
  description = "Name for the new Atlas project"
  type        = string
  default     = "my-atlas-project"
}

# ── Cluster ───────────────────────────────────────────────────────────────────
variable "cluster_name" {
  description = "Name for the Atlas cluster"
  type        = string
  default     = "myCluster"
}

variable "cluster_tier" {
  description = "Atlas cluster tier (M0 = free, M10+ = dedicated)"
  type        = string
  default     = "M0"  # Free tier
}

variable "cloud_provider" {
  description = "Cloud provider: AWS, GCP, or AZURE"
  type        = string
  default     = "AZURE"
}

variable "region" {
  description = "Cloud provider region for the cluster"
  type        = string
  default     = "US_EAST_2"
}

variable "mongo_db_major_version" {
  description = "MongoDB major version"
  type        = string
  default     = "8.0"
}

# ── Database User ─────────────────────────────────────────────────────────────
variable "db_username" {
  description = "Database username"
  type        = string
  default     = "appUser"
}

variable "db_password" {
  description = "Database user password"
  type        = string
  sensitive   = false
}

variable "db_role" {
  description = "Database user role"
  type        = string
  default     = "readWriteAnyDatabase"
  # Options: atlasAdmin | readWriteAnyDatabase | readAnyDatabase
}

# ── Network Access ────────────────────────────────────────────────────────────
variable "allowed_ip_addresses" {
  description = "List of IP addresses/CIDR blocks to whitelist"
  type = list(object({
    cidr_block  = string
    comment     = string
  }))
  default = [
    {
      cidr_block = "0.0.0.0/0"
      comment    = "Allow all (dev only — restrict in production)"
    }
  ]
}

# ── Database ──────────────────────────────────────────────────────────────────
variable "database_name" {
  description = "Name of the default database"
  type        = string
  default     = "myDatabase"
}
