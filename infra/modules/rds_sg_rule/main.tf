resource "aws_vpc_security_group_ingress_rule" "rds_from_ecs_backend" {
  security_group_id            = var.rds_security_group_id
  referenced_security_group_id = var.ecs_backend_security_group_id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "Allow PostgreSQL from ECS Backend"
}
