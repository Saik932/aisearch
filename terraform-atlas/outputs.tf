# ─────────────────────────────────────────────────────────────────────────────
# outputs.tf
# Useful values printed after terraform apply.
# Connection string is marked sensitive — use: terraform output -raw connection_string
# ─────────────────────────────────────────────────────────────────────────────

output "project_id" {
  description = "Atlas Project ID"
  value       = mongodbatlas_project.this.id
}

output "project_name" {
  description = "Atlas Project Name"
  value       = mongodbatlas_project.this.name
}

output "cluster_id" {
  description = "Atlas Cluster ID"
  value       = mongodbatlas_cluster.this.cluster_id
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
  description = "MongoDB version running on the cluster"
  value       = mongodbatlas_cluster.this.mongo_db_version
}

output "db_username" {
  description = "Database username"
  value       = mongodbatlas_database_user.app_user.username
}

# ── Connection Strings ────────────────────────────────────────────────────────

output "connection_string_srv" {
  description = "Standard SRV connection string (use this in your app)"
  value       = mongodbatlas_cluster.this.connection_strings[0].standard_srv
  sensitive   = true
  # To view: terraform output -raw connection_string_srv
}

output "connection_string_standard" {
  description = "Standard (non-SRV) connection string"
  value       = mongodbatlas_cluster.this.connection_strings[0].standard
  sensitive   = true
  # To view: terraform output -raw connection_string_standard
}

output "connection_string_with_credentials" {
  description = "Full connection string with username embedded (password excluded for security)"
  value = format(
    "%s?retryWrites=true&w=majority",
    replace(
      mongodbatlas_cluster.this.connection_strings[0].standard_srv,
      "mongodb+srv://",
      "mongodb+srv://${var.db_username}:<password>@"
    )
  )
  sensitive = true
  # Replace <password> with your actual password before use
}

output "nodejs_env_snippet" {
  description = "Ready-to-use .env snippet for Node.js apps"
  value = <<-EOT
    # Add to your backend/.env file
    # Replace <password> with: ${var.db_password == "" ? "your_password" : "****"}
    MONGO_URI=mongodb+srv://${var.db_username}:<password>@${replace(mongodbatlas_cluster.this.connection_strings[0].standard_srv, "mongodb+srv://", "")}/${var.database_name}?retryWrites=true&w=majority
    PORT=4000
  EOT
  sensitive = true
}
