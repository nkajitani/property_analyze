output "cloudfront_certificate_arn" {
  description = "CloudFront 用 ACM 証明書の ARN（us-east-1）。domain_name 未設定の場合は空文字"
  value       = local.create_certificate ? aws_acm_certificate.cloudfront[0].arn : ""
}

output "alb_certificate_arn" {
  description = "ALB 用 ACM 証明書の ARN（ap-northeast-1）。domain_name 未設定の場合は空文字"
  value       = local.create_certificate ? aws_acm_certificate.alb[0].arn : ""
}

output "route53_zone_id" {
  description = "作成した Route53 ホストゾーンの ID。domain_name 未設定の場合は空文字"
  value       = local.create_certificate ? aws_route53_zone.main[0].zone_id : ""
}

output "route53_name_servers" {
  description = "Route53 ホストゾーンのネームサーバー一覧（ドメインレジストラへの NS 登録に使用）"
  value       = local.create_certificate ? aws_route53_zone.main[0].name_servers : []
}

output "domain_name" {
  description = "設定されたドメイン名"
  value       = var.domain_name
}

output "cloudfront_validation_record_fqdns" {
  description = "CloudFront 証明書の DNS 検証レコード FQDN 一覧（acm_validation モジュールへ渡す）"
  value       = [for r in aws_route53_record.cloudfront_validation : r.fqdn]
}

output "alb_validation_record_fqdns" {
  description = "ALB 証明書の DNS 検証レコード FQDN 一覧（acm_validation モジュールへ渡す）"
  value       = [for r in aws_route53_record.alb_validation : r.fqdn]
}
