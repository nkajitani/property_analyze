variable "env" {
  type        = string
  description = "デプロイ環境名（dev / prod）"
}

variable "common_tags" {
  type        = map(string)
  description = "全リソースに付与する共通タグ"
  default     = {}
}

variable "vpc_id" {
  type        = string
  description = "ALB を配置する VPC の ID"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "ALB を配置するパブリックサブネット ID のリスト"
}

variable "acm_certificate_arn" {
  type        = string
  description = "HTTPS リスナーに紐付ける ACM 証明書の ARN"
}

variable "frontend_container_port" {
  type        = number
  description = "Frontend コンテナが使用するポート番号"
  default     = 80
}

variable "backend_container_port" {
  type        = number
  description = "Backend コンテナが使用するポート番号"
  default     = 8000
}

variable "health_check_path_frontend" {
  type        = string
  description = "Frontend Target Group のヘルスチェックパス"
  default     = "/"
}

variable "health_check_path_backend" {
  type        = string
  description = "Backend Target Group のヘルスチェックパス"
  default     = "/health"
}

variable "idle_timeout" {
  type        = number
  description = "ALB のアイドルタイムアウト（秒）"
  default     = 60
}

variable "cloudfront_prefix_list_id" {
  type        = string
  description = "CloudFront からの通信のみ許可する場合に使用するプレフィックスリスト ID（空文字の場合は 0.0.0.0/0 を許可）"
  default     = ""
}
