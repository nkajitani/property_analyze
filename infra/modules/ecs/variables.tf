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
  description = "ECS サービスを配置する VPC の ID"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "NAT Gateway 無効時に使用するパブリックサブネット ID のリスト"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "NAT Gateway 有効時に使用するプライベートサブネット ID のリスト"
}

variable "enable_nat_gateway" {
  type        = bool
  description = "NAT Gateway が有効な場合は true（ECS をプライベートサブネットに配置）"
  default     = false
}

variable "alb_security_group_id" {
  type        = string
  description = "ALB セキュリティグループの ID（Frontend へのアクセスを許可する対象）"
}

variable "frontend_target_group_arn" {
  type        = string
  description = "ALB Frontend Target Group の ARN"
}

variable "backend_target_group_arn" {
  type        = string
  description = "ALB Backend Target Group の ARN"
}

variable "ecr_frontend_image" {
  type        = string
  description = "Frontend コンテナイメージの URI（ECR rei/frontend）"
}

variable "ecr_backend_image" {
  type        = string
  description = "Backend コンテナイメージの URI（ECR rei/backend）"
}

variable "frontend_cpu" {
  type        = number
  description = "Frontend タスクに割り当てる CPU ユニット数"
  default     = 256
}

variable "frontend_memory" {
  type        = number
  description = "Frontend タスクに割り当てるメモリ（MiB）"
  default     = 512
}

variable "backend_cpu" {
  type        = number
  description = "Backend タスクに割り当てる CPU ユニット数"
  default     = 256
}

variable "backend_memory" {
  type        = number
  description = "Backend タスクに割り当てるメモリ（MiB）"
  default     = 512
}

variable "frontend_desired_count" {
  type        = number
  description = "Frontend サービスの希望タスク数"
  default     = 1
}

variable "backend_desired_count" {
  type        = number
  description = "Backend サービスの希望タスク数"
  default     = 1
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

variable "db_secret_arn" {
  type        = string
  description = "DB パスワードを含む Secrets Manager シークレットの ARN"
}

variable "database_url_secret_arn" {
  type        = string
  description = "DATABASE_URL を含む Secrets Manager シークレットの ARN"
}

variable "admin_token_secret_arn" {
  type        = string
  description = "ADMIN_TOKEN を含む Secrets Manager シークレットの ARN"
}

variable "db_host" {
  type        = string
  description = "RDS エンドポイントのホスト名"
}

variable "db_name" {
  type        = string
  description = "データベース名"
  default     = "rei_db"
}

variable "db_port" {
  type        = number
  description = "データベースポート番号"
  default     = 5432
}

variable "api_base_url" {
  type        = string
  description = "Backend API のベース URL（ECS 環境変数 API_BASE_URL）"
  default     = "http://backend.rei.internal:8000"
}

variable "aws_region" {
  type        = string
  description = "AWS リージョン"
  default     = "ap-northeast-1"
}
