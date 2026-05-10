# ─────────────────────────────────────────────────────────────────────────────
# outputs.tf
# Outputs cluster info + all 10 user connection strings
# ─────────────────────────────────────────────────────────────────────────────

# ── Cluster Info ──────────────────────────────────────────────────────────────
output "project_id" {
  description = "Atlas Project ID"
  value       = mongodbatlas_project.this.id
}

output "cluster_name" {
  description = "Atlas Cluster Name"
  value       = mongodbatlas_cluster.this.name
}

output "cluster_state" {
  description = "Current state of the cluster"
  value       = mongodbatlas_cluster.this.state_name
}

output "mongo_db_version" {
  description = "MongoDB version"
  value       = mongodbatlas_cluster.this.mongo_db_version
}

# ── Base SRV host (without credentials) ──────────────────────────────────────
output "cluster_srv_host" {
  description = "Cluster SRV host (without credentials)"
  value       = replace(mongodbatlas_cluster.this.connection_strings[0].standard_srv, "mongodb+srv://", "")
}

# ── All 10 user connection strings ────────────────────────────────────────────
output "connection_strings" {
  description = "Connection strings for all 10 database users"
  sensitive   = true
  value = {
    for key, user in local.db_users :
    key => "mongodb+srv://${user.username}:${user.password}@${replace(mongodbatlas_cluster.this.connection_strings[0].standard_srv, "mongodb+srv://", "")}/${user.database}?retryWrites=true&w=majority"
  }
}

# ── Individual connection strings (one per user) ──────────────────────────────
output "connection_string_user01" {
  description = "user01 → db_analytics"
  sensitive   = true
  value       = "mongodb+srv://user01:User01Pass2026!@${replace(mongodbatlas_cluster.this.connection_strings[0].standard_srv, "mongodb+srv://", "")}/db_analytics?retryWrites=true&w=majority"
}

output "connection_string_user02" {
  description = "user02 → db_finance"
  sensitive   = true
  value       = "mongodb+srv://user02:User02Pass2026!@${replace(mongodbatlas_cluster.this.connection_strings[0].standard_srv, "mongodb+srv://", "")}/db_finance?retryWrites=true&w=majority"
}

output "connection_string_user03" {
  description = "user03 → db_hr"
  sensitive   = true
  value       = "mongodb+srv://user03:User03Pass2026!@${replace(mongodbatlas_cluster.this.connection_strings[0].standard_srv, "mongodb+srv://", "")}/db_hr?retryWrites=true&w=majority"
}

output "connection_string_user04" {
  description = "user04 → db_sales"
  sensitive   = true
  value       = "mongodb+srv://user04:User04Pass2026!@${replace(mongodbatlas_cluster.this.connection_strings[0].standard_srv, "mongodb+srv://", "")}/db_sales?retryWrites=true&w=majority"
}

output "connection_string_user05" {
  description = "user05 → db_marketing"
  sensitive   = true
  value       = "mongodb+srv://user05:User05Pass2026!@${replace(mongodbatlas_cluster.this.connection_strings[0].standard_srv, "mongodb+srv://", "")}/db_marketing?retryWrites=true&w=majority"
}

output "connection_string_user06" {
  description = "user06 → db_operations"
  sensitive   = true
  value       = "mongodb+srv://user06:User06Pass2026!@${replace(mongodbatlas_cluster.this.connection_strings[0].standard_srv, "mongodb+srv://", "")}/db_operations?retryWrites=true&w=majority"
}

output "connection_string_user07" {
  description = "user07 → db_compliance"
  sensitive   = true
  value       = "mongodb+srv://user07:User07Pass2026!@${replace(mongodbatlas_cluster.this.connection_strings[0].standard_srv, "mongodb+srv://", "")}/db_compliance?retryWrites=true&w=majority"
}

output "connection_string_user08" {
  description = "user08 → db_audit"
  sensitive   = true
  value       = "mongodb+srv://user08:User08Pass2026!@${replace(mongodbatlas_cluster.this.connection_strings[0].standard_srv, "mongodb+srv://", "")}/db_audit?retryWrites=true&w=majority"
}

output "connection_string_user09" {
  description = "user09 → db_reporting"
  sensitive   = true
  value       = "mongodb+srv://user09:User09Pass2026!@${replace(mongodbatlas_cluster.this.connection_strings[0].standard_srv, "mongodb+srv://", "")}/db_reporting?retryWrites=true&w=majority"
}

output "connection_string_user10" {
  description = "user10 → db_taxsearch"
  sensitive   = true
  value       = "mongodb+srv://user10:User10Pass2026!@${replace(mongodbatlas_cluster.this.connection_strings[0].standard_srv, "mongodb+srv://", "")}/db_taxsearch?retryWrites=true&w=majority"
}

# ── Summary table ─────────────────────────────────────────────────────────────
output "users_summary" {
  description = "Summary of all users and their databases"
  value = {
    for key, user in local.db_users :
    user.username => {
      database = user.database
      role     = user.role
    }
  }
}
