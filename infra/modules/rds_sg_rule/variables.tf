variable "rds_security_group_id" {
  type        = string
  description = "RDS セキュリティグループの ID"
}

variable "ecs_backend_security_group_id" {
  type        = string
  description = "ECS Backend タスクのセキュリティグループ ID"
}
