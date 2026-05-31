output "ecs_task_execution_role_arn" {
  description = "ECS タスク実行ロールの ARN"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "ecs_task_execution_role_name" {
  description = "ECS タスク実行ロールの名前"
  value       = aws_iam_role.ecs_task_execution.name
}

output "ecs_task_role_arn" {
  description = "ECS タスクロールの ARN"
  value       = aws_iam_role.ecs_task.arn
}

output "ecs_task_role_name" {
  description = "ECS タスクロールの名前"
  value       = aws_iam_role.ecs_task.name
}

output "github_actions_deploy_role_arn" {
  description = "GitHub Actions デプロイロールの ARN（AWS_DEPLOY_ROLE_ARN シークレットに設定する）"
  value       = aws_iam_role.github_actions_deploy.arn
}
