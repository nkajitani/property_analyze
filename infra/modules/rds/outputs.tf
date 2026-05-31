output "db_instance_id" {
  description = "RDS インスタンスの ID"
  value       = aws_db_instance.main.id
}

output "db_instance_address" {
  description = "RDS インスタンスのエンドポイントホスト名"
  value       = aws_db_instance.main.address
}

output "db_instance_endpoint" {
  description = "RDS インスタンスの接続エンドポイント（host:port 形式）"
  value       = aws_db_instance.main.endpoint
}

output "db_instance_port" {
  description = "RDS インスタンスのポート番号"
  value       = aws_db_instance.main.port
}

output "db_name" {
  description = "データベース名"
  value       = aws_db_instance.main.db_name
}

output "db_username" {
  description = "データベースマスターユーザー名"
  value       = aws_db_instance.main.username
}

output "security_group_id" {
  description = "RDS セキュリティグループの ID"
  value       = aws_security_group.main.id
}

output "db_subnet_group_name" {
  description = "RDS サブネットグループ名"
  value       = aws_db_subnet_group.main.name
}

