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
  description = "RDS を配置する VPC の ID"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "RDS サブネットグループに使用するプライベートサブネット ID のリスト"
}

variable "db_instance_class" {
  type        = string
  description = "RDS インスタンスクラス"
  default     = "db.t4g.micro"
}

variable "rds_multi_az" {
  type        = bool
  description = "Multi-AZ 配置を有効化するか（prod 推奨）"
  default     = false
}

variable "db_password_secret_arn" {
  type        = string
  description = "Secrets Manager に保存された DB パスワードのシークレット ARN"
}

variable "allocated_storage" {
  type        = number
  description = "RDS の割り当てストレージ容量（GiB）"
  default     = 20
}

variable "backup_retention_period" {
  type        = number
  description = "自動バックアップの保持日数"
  default     = 7
}

variable "deletion_protection" {
  type        = bool
  description = "削除保護を有効化するか"
  default     = false
}
