locals {
  name_prefix = "rei-ecs-${var.env}"
  tags        = merge(var.common_tags, { Module = "ecs" })

  # NAT Gateway の有無によってサブネットと Public IP 付与を切り替える
  task_subnet_ids   = var.enable_nat_gateway ? var.private_subnet_ids : var.public_subnet_ids
  assign_public_ip  = var.enable_nat_gateway ? false : true
}

# ---------------------------------------------------------------------------
# ECS Cluster
# ---------------------------------------------------------------------------
resource "aws_ecs_cluster" "main" {
  name = local.name_prefix

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = merge(local.tags, { Name = local.name_prefix })
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1
  }
}

# ---------------------------------------------------------------------------
# CloudWatch Logs Groups
# ---------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/rei/${var.env}/frontend"
  retention_in_days = 30

  tags = merge(local.tags, { Name = "rei-logs-frontend-${var.env}" })
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/rei/${var.env}/backend"
  retention_in_days = 30

  tags = merge(local.tags, { Name = "rei-logs-backend-${var.env}" })
}

# ---------------------------------------------------------------------------
# IAM: Task Execution Role
# ---------------------------------------------------------------------------
data "aws_iam_policy_document" "ecs_task_assume" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "task_execution" {
  name               = "${local.name_prefix}-task-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json

  tags = merge(local.tags, { Name = "${local.name_prefix}-task-execution-role" })
}

resource "aws_iam_role_policy_attachment" "task_execution_managed" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Secrets Manager からシークレットを取得するポリシー
data "aws_iam_policy_document" "secrets_access" {
  statement {
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [var.db_secret_arn]
  }
}

resource "aws_iam_role_policy" "secrets_access" {
  name   = "${local.name_prefix}-secrets-access"
  role   = aws_iam_role.task_execution.id
  policy = data.aws_iam_policy_document.secrets_access.json
}

# ---------------------------------------------------------------------------
# IAM: Task Role（アプリが AWS サービスを呼び出す権限）
# ---------------------------------------------------------------------------
resource "aws_iam_role" "task" {
  name               = "${local.name_prefix}-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json

  tags = merge(local.tags, { Name = "${local.name_prefix}-task-role" })
}

# ---------------------------------------------------------------------------
# Security Groups
# ---------------------------------------------------------------------------

# Frontend SG: ALB からのトラフィックのみ受け入れる
resource "aws_security_group" "frontend" {
  name        = "${local.name_prefix}-frontend-sg"
  description = "Security group for ECS Frontend tasks"
  vpc_id      = var.vpc_id

  tags = merge(local.tags, { Name = "${local.name_prefix}-frontend-sg" })
}

resource "aws_vpc_security_group_ingress_rule" "frontend_from_alb" {
  security_group_id            = aws_security_group.frontend.id
  referenced_security_group_id = var.alb_security_group_id
  from_port                    = var.frontend_container_port
  to_port                      = var.frontend_container_port
  ip_protocol                  = "tcp"
  description                  = "Allow traffic from ALB to Frontend"

  tags = merge(local.tags, { Name = "${local.name_prefix}-frontend-ingress-alb" })
}

resource "aws_vpc_security_group_egress_rule" "frontend_allow_all" {
  security_group_id = aws_security_group.frontend.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
  description       = "Allow all outbound traffic from Frontend"

  tags = merge(local.tags, { Name = "${local.name_prefix}-frontend-egress-all" })
}

# Backend SG: ALB からのトラフィックのみ受け入れる
resource "aws_security_group" "backend" {
  name        = "${local.name_prefix}-backend-sg"
  description = "Security group for ECS Backend tasks"
  vpc_id      = var.vpc_id

  tags = merge(local.tags, { Name = "${local.name_prefix}-backend-sg" })
}

resource "aws_vpc_security_group_ingress_rule" "backend_from_alb" {
  security_group_id            = aws_security_group.backend.id
  referenced_security_group_id = var.alb_security_group_id
  from_port                    = var.backend_container_port
  to_port                      = var.backend_container_port
  ip_protocol                  = "tcp"
  description                  = "Allow traffic from ALB to Backend"

  tags = merge(local.tags, { Name = "${local.name_prefix}-backend-ingress-alb" })
}

resource "aws_vpc_security_group_egress_rule" "backend_allow_all" {
  security_group_id = aws_security_group.backend.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
  description       = "Allow all outbound traffic from Backend"

  tags = merge(local.tags, { Name = "${local.name_prefix}-backend-egress-all" })
}

# ---------------------------------------------------------------------------
# Task Definitions
# ---------------------------------------------------------------------------

# Frontend Task Definition
resource "aws_ecs_task_definition" "frontend" {
  family                   = "rei-frontend-${var.env}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.frontend_cpu
  memory                   = var.frontend_memory
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = "frontend"
      image     = var.ecr_frontend_image
      essential = true

      portMappings = [
        {
          containerPort = var.frontend_container_port
          hostPort      = var.frontend_container_port
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.env == "prod" ? "production" : "development"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.frontend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "frontend"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${var.frontend_container_port}/ || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = merge(local.tags, { Name = "rei-frontend-${var.env}" })
}

# Backend Task Definition
resource "aws_ecs_task_definition" "backend" {
  family                   = "rei-backend-${var.env}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.backend_cpu
  memory                   = var.backend_memory
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = var.ecr_backend_image
      essential = true

      portMappings = [
        {
          containerPort = var.backend_container_port
          hostPort      = var.backend_container_port
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "API_BASE_URL"
          value = var.api_base_url
        },
        {
          name  = "DB_HOST"
          value = var.db_host
        },
        {
          name  = "DB_PORT"
          value = tostring(var.db_port)
        },
        {
          name  = "DB_NAME"
          value = var.db_name
        },
        {
          name  = "APP_ENV"
          value = var.env
        }
      ]

      secrets = [
        {
          name      = "DB_PASSWORD"
          valueFrom = var.db_secret_arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${var.backend_container_port}/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = merge(local.tags, { Name = "rei-backend-${var.env}" })
}

# ---------------------------------------------------------------------------
# ECS Services
# ---------------------------------------------------------------------------

# Frontend Service
resource "aws_ecs_service" "frontend" {
  name            = "rei-frontend-${var.env}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = var.frontend_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = local.task_subnet_ids
    security_groups  = [aws_security_group.frontend.id]
    assign_public_ip = local.assign_public_ip
  }

  load_balancer {
    target_group_arn = var.frontend_target_group_arn
    container_name   = "frontend"
    container_port   = var.frontend_container_port
  }

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  enable_execute_command = true

  lifecycle {
    # デプロイパイプラインによるタスク定義更新を Terraform が上書きしないようにする
    ignore_changes = [task_definition, desired_count]
  }

  tags = merge(local.tags, { Name = "rei-frontend-${var.env}" })
}

# Backend Service
resource "aws_ecs_service" "backend" {
  name            = "rei-backend-${var.env}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.backend_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = local.task_subnet_ids
    security_groups  = [aws_security_group.backend.id]
    assign_public_ip = local.assign_public_ip
  }

  load_balancer {
    target_group_arn = var.backend_target_group_arn
    container_name   = "backend"
    container_port   = var.backend_container_port
  }

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  enable_execute_command = true

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  tags = merge(local.tags, { Name = "rei-backend-${var.env}" })
}
