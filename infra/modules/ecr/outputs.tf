output "frontend_repository_url" {
  description = "フロントエンド ECR リポジトリの URL"
  value       = aws_ecr_repository.main["frontend"].repository_url
}

output "backend_repository_url" {
  description = "バックエンド ECR リポジトリの URL"
  value       = aws_ecr_repository.main["backend"].repository_url
}

output "repository_urls" {
  description = "全 ECR リポジトリの URL マップ（キー: frontend / backend）"
  value       = { for k, v in aws_ecr_repository.main : k => v.repository_url }
}
