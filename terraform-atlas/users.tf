# ─────────────────────────────────────────────────────────────────────────────
# users.tf
# Creates 10 database users, each scoped to their own database.
# Each user gets readWrite access only to their own database.
# ─────────────────────────────────────────────────────────────────────────────

locals {
  # Define 10 databases with their users and passwords
  db_users = {
    "user01" = {
      username  = "user01"
      password  = "User01Pass2026!"
      database  = "db_analytics"
      role      = "readWrite"
    }
    "user02" = {
      username  = "user02"
      password  = "User02Pass2026!"
      database  = "db_finance"
      role      = "readWrite"
    }
    "user03" = {
      username  = "user03"
      password  = "User03Pass2026!"
      database  = "db_hr"
      role      = "readWrite"
    }
    "user04" = {
      username  = "user04"
      password  = "User04Pass2026!"
      database  = "db_sales"
      role      = "readWrite"
    }
    "user05" = {
      username  = "user05"
      password  = "User05Pass2026!"
      database  = "db_marketing"
      role      = "readWrite"
    }
    "user06" = {
      username  = "user06"
      password  = "User06Pass2026!"
      database  = "db_operations"
      role      = "readWrite"
    }
    "user07" = {
      username  = "user07"
      password  = "User07Pass2026!"
      database  = "db_compliance"
      role      = "readWrite"
    }
    "user08" = {
      username  = "user08"
      password  = "User08Pass2026!"
      database  = "db_audit"
      role      = "readWrite"
    }
    "user09" = {
      username  = "user09"
      password  = "User09Pass2026!"
      database  = "db_reporting"
      role      = "readWrite"
    }
    "user10" = {
      username  = "user10"
      password  = "User10Pass2026!"
      database  = "db_taxsearch"
      role      = "readWrite"
    }
  }
}

# ── Create all 10 database users ──────────────────────────────────────────────
resource "mongodbatlas_database_user" "users" {
  for_each = local.db_users

  project_id         = mongodbatlas_project.this.id
  username           = each.value.username
  password           = each.value.password
  auth_database_name = "admin"

  # Scoped to their own database only
  roles {
    role_name     = each.value.role
    database_name = each.value.database
  }

  # Scoped to this cluster only
  scopes {
    name = mongodbatlas_cluster.this.name
    type = "CLUSTER"
  }

  labels {
    key   = "database"
    value = each.value.database
  }

  labels {
    key   = "created-by"
    value = "terraform"
  }
}
