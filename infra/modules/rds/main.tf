locals {
  name_prefix     = "rei-rds-${var.env}"
  tags            = merge(var.common_tags, { Module = "rds" })
  _secret_raw     = trimspace(data.aws_secretsmanager_secret_version.db_password.secret_string)
  # JSON形式（{"password":"..."}）でも平文でも両対応
  db_password     = can(jsondecode(local._secret_raw)["password"]) ? jsondecode(local._secret_raw)["password"] : local._secret_raw
}

# ---------------------------------------------------------------------------
# Secrets Manager からパスワードを取得
# ---------------------------------------------------------------------------
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = var.db_password_secret_arn
}

# ---------------------------------------------------------------------------
# Security Group
# ---------------------------------------------------------------------------
resource "aws_security_group" "main" {
  name        = "${local.name_prefix}-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = var.vpc_id

  tags = merge(local.tags, { Name = "${local.name_prefix}-sg" })
}

# アウトバウンド: 全許可
resource "aws_vpc_security_group_egress_rule" "allow_all" {
  security_group_id = aws_security_group.main.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
  description       = "Allow all outbound traffic"

  tags = merge(local.tags, { Name = "${local.name_prefix}-egress-all" })
}

# ---------------------------------------------------------------------------
# DB Subnet Group
# ---------------------------------------------------------------------------
resource "aws_db_subnet_group" "main" {
  name        = "${local.name_prefix}-subnet-group"
  subnet_ids  = var.private_subnet_ids
  description = "Subnet group for ${local.name_prefix}"

  tags = merge(local.tags, { Name = "${local.name_prefix}-subnet-group" })
}

# ---------------------------------------------------------------------------
# DB Parameter Group
# ---------------------------------------------------------------------------
resource "aws_db_parameter_group" "main" {
  name        = "${local.name_prefix}-pg16"
  family      = "postgres16"
  description = "Parameter group for ${local.name_prefix} PostgreSQL 16"

  tags = merge(local.tags, { Name = "${local.name_prefix}-pg16" })
}

# ---------------------------------------------------------------------------
# RDS Instance
# ---------------------------------------------------------------------------
resource "aws_db_instance" "main" {
  identifier = local.name_prefix

  engine         = "postgres"
  engine_version = "16"
  instance_class = var.db_instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.allocated_storage * 2
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "rei_db"
  username = "rei_admin"
  password = local.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.main.id]
  parameter_group_name   = aws_db_parameter_group.main.name

  multi_az               = var.rds_multi_az
  publicly_accessible    = false
  skip_final_snapshot    = var.env == "prod" ? false : true
  final_snapshot_identifier = var.env == "prod" ? "${local.name_prefix}-final-snapshot" : null
  deletion_protection    = var.deletion_protection

  backup_retention_period = var.backup_retention_period
  backup_window           = "02:00-03:00"
  maintenance_window      = "Mon:03:00-Mon:04:00"

  performance_insights_enabled = true
  monitoring_interval          = 60
  monitoring_role_arn          = aws_iam_role.rds_enhanced_monitoring.arn

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = merge(local.tags, { Name = local.name_prefix })
}

# ---------------------------------------------------------------------------
# Enhanced Monitoring IAM Role
# ---------------------------------------------------------------------------
data "aws_iam_policy_document" "rds_monitoring_assume" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["monitoring.rds.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "rds_enhanced_monitoring" {
  name               = "${local.name_prefix}-enhanced-monitoring"
  assume_role_policy = data.aws_iam_policy_document.rds_monitoring_assume.json

  tags = merge(local.tags, { Name = "${local.name_prefix}-enhanced-monitoring" })
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  role       = aws_iam_role.rds_enhanced_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
