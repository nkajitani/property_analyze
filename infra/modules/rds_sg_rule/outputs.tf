output "ingress_rule_id" {
  description = "作成された RDS SG ingress ルールの ID"
  value       = aws_vpc_security_group_ingress_rule.rds_from_ecs_backend.id
}
