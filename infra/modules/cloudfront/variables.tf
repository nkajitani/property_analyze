variable "env" {
  type        = string
  description = "デプロイ環境名（dev / prod）"
}

variable "common_tags" {
  type        = map(string)
  description = "全リソースに付与する共通タグ"
  default     = {}
}

variable "s3_bucket_regional_domain_name" {
  type        = string
  description = "静的アセット S3 バケットのリージョン別ドメイン名"
}

variable "s3_bucket_id" {
  type        = string
  description = "静的アセット S3 バケットの ID（OAC 設定用）"
}

variable "alb_dns_name" {
  type        = string
  description = "ALB の DNS 名（CloudFront ALB Origin 設定用）"
}

variable "acm_certificate_arn" {
  type        = string
  description = "CloudFront に紐付ける ACM 証明書の ARN（us-east-1、空文字の場合はデフォルト証明書を使用）"
  default     = ""
}

variable "aliases" {
  type        = list(string)
  description = "CloudFront Distribution に紐付けるカスタムドメイン名のリスト（acm_certificate_arn と合わせて設定）"
  default     = []
}

variable "geo_ttl" {
  type        = number
  description = "/geo/* パスの CloudFront キャッシュ TTL（秒）"
  default     = 31536000
}

variable "static_ttl" {
  type        = number
  description = "/_next/static/* パスの CloudFront キャッシュ TTL（秒）"
  default     = 31536000
}

variable "price_class" {
  type        = string
  description = "CloudFront の料金クラス"
  default     = "PriceClass_All"

  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.price_class)
    error_message = "price_class は PriceClass_100, PriceClass_200, PriceClass_All のいずれかを指定してください。"
  }
}

variable "web_acl_id" {
  type        = string
  description = "WAF Web ACL の ARN（設定しない場合は空文字）"
  default     = ""
}

variable "route53_zone_id" {
  type        = string
  description = "Route53 ホストゾーン ID（aliases が設定されている場合に Alias レコードを作成する）"
  default     = ""
}
