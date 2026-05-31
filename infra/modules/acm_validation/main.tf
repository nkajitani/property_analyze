locals {
  validate = var.cloudfront_certificate_arn != ""
  tags     = merge(var.common_tags, { Module = "acm_validation" })
}

# ---------------------------------------------------------------------------
# ACM 証明書検証完了待ち — CloudFront 用（us-east-1）
# NS がレジストラに反映された後に apply すること
# ---------------------------------------------------------------------------
resource "aws_acm_certificate_validation" "cloudfront" {
  count    = local.validate ? 1 : 0
  provider = aws.us_east_1

  certificate_arn         = var.cloudfront_certificate_arn
  validation_record_fqdns = var.cloudfront_validation_record_fqdns
}

# ---------------------------------------------------------------------------
# ACM 証明書検証完了待ち — ALB 用（ap-northeast-1）
# ---------------------------------------------------------------------------
resource "aws_acm_certificate_validation" "alb" {
  count = local.validate ? 1 : 0

  certificate_arn         = var.alb_certificate_arn
  validation_record_fqdns = var.alb_validation_record_fqdns
}
