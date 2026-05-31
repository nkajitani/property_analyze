locals {
  name_prefix = "rei-alb-${var.env}"
  tags        = merge(var.common_tags, { Module = "alb" })
}

# ---------------------------------------------------------------------------
# Security Group
# ---------------------------------------------------------------------------
resource "aws_security_group" "main" {
  name        = "${local.name_prefix}-sg"
  description = "Security group for ALB"
  vpc_id      = var.vpc_id

  tags = merge(local.tags, { Name = "${local.name_prefix}-sg" })
}

# HTTP: インターネットからの 80 を許可
resource "aws_vpc_security_group_ingress_rule" "http" {
  security_group_id = aws_security_group.main.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
  description       = "Allow HTTP from internet"

  tags = merge(local.tags, { Name = "${local.name_prefix}-ingress-http" })
}

# HTTPS: インターネットからの 443 を許可
resource "aws_vpc_security_group_ingress_rule" "https" {
  security_group_id = aws_security_group.main.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  description       = "Allow HTTPS from internet"

  tags = merge(local.tags, { Name = "${local.name_prefix}-ingress-https" })
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
# ALB 本体
# ---------------------------------------------------------------------------
resource "aws_lb" "main" {
  name               = local.name_prefix
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.main.id]
  subnets            = var.public_subnet_ids

  idle_timeout               = var.idle_timeout
  enable_deletion_protection = false
  drop_invalid_header_fields = true

  tags = merge(local.tags, { Name = local.name_prefix })
}

# ---------------------------------------------------------------------------
# Target Groups
# ---------------------------------------------------------------------------
resource "aws_lb_target_group" "frontend" {
  name        = "rei-tg-frontend-${var.env}"
  port        = var.frontend_container_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = var.health_check_path_frontend
    protocol            = "HTTP"
    port                = "traffic-port"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  deregistration_delay = 30

  tags = merge(local.tags, { Name = "rei-tg-frontend-${var.env}" })
}

resource "aws_lb_target_group" "backend" {
  name        = "rei-tg-backend-${var.env}"
  port        = var.backend_container_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = var.health_check_path_backend
    protocol            = "HTTP"
    port                = "traffic-port"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  deregistration_delay = 30

  tags = merge(local.tags, { Name = "rei-tg-backend-${var.env}" })
}

# ---------------------------------------------------------------------------
# HTTP Listener: 80 → 443 リダイレクト
# ---------------------------------------------------------------------------
resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  tags = merge(local.tags, { Name = "${local.name_prefix}-listener-http" })
}

# ---------------------------------------------------------------------------
# HTTPS Listener: 443
# ---------------------------------------------------------------------------
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  # デフォルトアクション: Frontend へ転送
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }

  tags = merge(local.tags, { Name = "${local.name_prefix}-listener-https" })
}

# ---------------------------------------------------------------------------
# Listener Rules
# ---------------------------------------------------------------------------

# /api/* → Backend Target Group
resource "aws_lb_listener_rule" "api_backend" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }

  tags = merge(local.tags, { Name = "${local.name_prefix}-rule-api-backend" })
}
