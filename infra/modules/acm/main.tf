locals {
  create_certificate = var.domain_name != ""
  tags               = merge(var.common_tags, { Module = "acm" })
}

# ---------------------------------------------------------------------------
# Route53 ホストゾーン（プロジェクト単位で管理）
# ---------------------------------------------------------------------------
resource "aws_route53_zone" "main" {
  count   = local.create_certificate ? 1 : 0
  name    = var.root_domain_name != "" ? var.root_domain_name : var.domain_name
  comment = "Managed by Terraform - ${var.env} environment"

  tags = merge(local.tags, { Name = "rei-hz-${var.env}" })
}

# ---------------------------------------------------------------------------
# ACM 証明書 — CloudFront 用（us-east-1 必須）
# ---------------------------------------------------------------------------
resource "aws_acm_certificate" "cloudfront" {
  count    = local.create_certificate ? 1 : 0
  provider = aws.us_east_1

  domain_name               = var.domain_name
  subject_alternative_names = var.subject_alternative_names
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.tags, { Name = "rei-acm-cf-${var.env}" })
}

# ---------------------------------------------------------------------------
# ACM 証明書 — ALB 用（ap-northeast-1）
# ---------------------------------------------------------------------------
resource "aws_acm_certificate" "alb" {
  count = local.create_certificate ? 1 : 0

  domain_name               = var.domain_name
  subject_alternative_names = var.subject_alternative_names
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.tags, { Name = "rei-acm-alb-${var.env}" })
}

# ---------------------------------------------------------------------------
# Route53 DNS 検証レコード（CloudFront 証明書用）
# ---------------------------------------------------------------------------
resource "aws_route53_record" "cloudfront_validation" {
  for_each = local.create_certificate ? {
    for dvo in aws_acm_certificate.cloudfront[0].domain_validation_options :
    dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main[0].zone_id
}

# ---------------------------------------------------------------------------
# Route53 DNS 検証レコード（ALB 証明書用）
# cloudfront と SANs が同一なら検証レコードが重複するため allow_overwrite = true
# ---------------------------------------------------------------------------
resource "aws_route53_record" "alb_validation" {
  for_each = local.create_certificate ? {
    for dvo in aws_acm_certificate.alb[0].domain_validation_options :
    dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main[0].zone_id
}

