output "cluster_id" {
  description = "ECS クラスターの ID"
  value       = aws_ecs_cluster.main.id
}

output "cluster_arn" {
  description = "ECS クラスターの ARN"
  value       = aws_ecs_cluster.main.arn
}

output "cluster_name" {
  description = "ECS クラスター名"
  value       = aws_ecs_cluster.main.name
}

output "frontend_service_id" {
  description = "ECS Frontend サービスの ID"
  value       = aws_ecs_service.frontend.id
}

output "frontend_service_name" {
  description = "ECS Frontend サービス名"
  value       = aws_ecs_service.frontend.name
}

output "backend_service_id" {
  description = "ECS Backend サービスの ID"
  value       = aws_ecs_service.backend.id
}

output "backend_service_name" {
  description = "ECS Backend サービス名"
  value       = aws_ecs_service.backend.name
}

output "frontend_task_definition_arn" {
  description = "Frontend タスク定義の ARN"
  value       = aws_ecs_task_definition.frontend.arn
}

output "backend_task_definition_arn" {
  description = "Backend タスク定義の ARN"
  value       = aws_ecs_task_definition.backend.arn
}

output "frontend_security_group_id" {
  description = "ECS Frontend タスクのセキュリティグループ ID"
  value       = aws_security_group.frontend.id
}

output "backend_security_group_id" {
  description = "ECS Backend タスクのセキュリティグループ ID"
  value       = aws_security_group.backend.id
}

output "task_execution_role_arn" {
  description = "ECS タスク実行ロールの ARN"
  value       = aws_iam_role.task_execution.arn
}

output "task_role_arn" {
  description = "ECS タスクロールの ARN"
  value       = aws_iam_role.task.arn
}

output "frontend_log_group_name" {
  description = "Frontend CloudWatch Logs グループ名"
  value       = aws_cloudwatch_log_group.frontend.name
}

output "backend_log_group_name" {
  description = "Backend CloudWatch Logs グループ名"
  value       = aws_cloudwatch_log_group.backend.name
}
