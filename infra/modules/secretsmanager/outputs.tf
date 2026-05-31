output "db_password_secret_arn" {
  description = "DB パスワードシークレットの ARN"
  value       = aws_secretsmanager_secret.db_password.arn
}

output "db_password_secret_name" {
  description = "DB パスワードシークレットの名前"
  value       = aws_secretsmanager_secret.db_password.name
}

output "api_key_secret_arn" {
  description = "API キーシークレットの ARN"
  value       = aws_secretsmanager_secret.api_key.arn
}

output "api_key_secret_name" {
  description = "API キーシークレットの名前"
  value       = aws_secretsmanager_secret.api_key.name
}
