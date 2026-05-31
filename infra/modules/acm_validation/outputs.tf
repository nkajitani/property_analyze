output "cloudfront_certificate_arn" {
  description = "検証済み CloudFront 用 ACM 証明書の ARN"
  value       = local.validate ? aws_acm_certificate_validation.cloudfront[0].certificate_arn : ""
}

output "alb_certificate_arn" {
  description = "検証済み ALB 用 ACM 証明書の ARN"
  value       = local.validate ? aws_acm_certificate_validation.alb[0].certificate_arn : ""
}
