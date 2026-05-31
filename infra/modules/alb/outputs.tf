output "alb_id" {
  description = "ALB のリソース ID"
  value       = aws_lb.main.id
}

output "alb_arn" {
  description = "ALB の ARN"
  value       = aws_lb.main.arn
}

output "alb_dns_name" {
  description = "ALB の DNS 名"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "ALB の Route53 ホストゾーン ID（Route53 エイリアスレコード用）"
  value       = aws_lb.main.zone_id
}

output "security_group_id" {
  description = "ALB セキュリティグループの ID"
  value       = aws_security_group.main.id
}

output "https_listener_arn" {
  description = "HTTPS リスナーの ARN"
  value       = aws_lb_listener.https.arn
}

output "frontend_target_group_arn" {
  description = "Frontend Target Group の ARN"
  value       = aws_lb_target_group.frontend.arn
}

output "backend_target_group_arn" {
  description = "Backend Target Group の ARN"
  value       = aws_lb_target_group.backend.arn
}
