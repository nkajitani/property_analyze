variable "env" {
  type        = string
  description = "デプロイ環境名（dev / prod）"
}

variable "common_tags" {
  type        = map(string)
  description = "全リソースに付与する共通タグ"
  default     = {}
}

variable "cloudfront_certificate_arn" {
  type        = string
  description = "CloudFront 用 ACM 証明書の ARN（us-east-1）"
}

variable "alb_certificate_arn" {
  type        = string
  description = "ALB 用 ACM 証明書の ARN（ap-northeast-1）"
}

variable "cloudfront_validation_record_fqdns" {
  type        = list(string)
  description = "CloudFront 証明書の DNS 検証レコード FQDN 一覧"
}

variable "alb_validation_record_fqdns" {
  type        = list(string)
  description = "ALB 証明書の DNS 検証レコード FQDN 一覧"
}
