output "distribution_id" {
  description = "CloudFront Distribution の ID"
  value       = aws_cloudfront_distribution.main.id
}

output "distribution_arn" {
  description = "CloudFront Distribution の ARN"
  value       = aws_cloudfront_distribution.main.arn
}

output "distribution_domain_name" {
  description = "CloudFront Distribution のドメイン名（xxx.cloudfront.net 形式）"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "distribution_hosted_zone_id" {
  description = "CloudFront Distribution の Route53 ホストゾーン ID（Route53 エイリアスレコード用）"
  value       = aws_cloudfront_distribution.main.hosted_zone_id
}

output "distribution_status" {
  description = "CloudFront Distribution のデプロイステータス"
  value       = aws_cloudfront_distribution.main.status
}

output "oac_id" {
  description = "Origin Access Control（OAC）の ID"
  value       = aws_cloudfront_origin_access_control.main.id
}
