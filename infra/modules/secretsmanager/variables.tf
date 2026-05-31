variable "name_prefix" {
  type        = string
  description = "リソース名のプレフィックス（{project}-{env} 形式）"
}

variable "project" {
  type        = string
  description = "プロジェクト識別子"
}

variable "env" {
  type        = string
  description = "デプロイ環境名（dev / prod）"
}

variable "db_password_secret_name" {
  type        = string
  description = "DB パスワードを格納する Secrets Manager シークレット名"
}

variable "api_key_secret_name" {
  type        = string
  description = "API キーを格納する Secrets Manager シークレット名"
}

variable "recovery_window_in_days" {
  type        = number
  description = "シークレット削除後の復旧可能期間（日数）。0 を指定すると即時削除"
  default     = 7
}

variable "common_tags" {
  type        = map(string)
  description = "全リソースに付与する共通タグ"
}
