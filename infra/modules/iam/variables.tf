variable "name_prefix" {
  type        = string
  description = "リソース名のプレフィックス（{project}-{env} 形式）"
}

variable "env" {
  type        = string
  description = "デプロイ環境名（dev / prod）"
}

variable "project" {
  type        = string
  description = "プロジェクト識別子"
}

variable "common_tags" {
  type        = map(string)
  description = "全リソースに付与する共通タグ"
}

variable "aws_region" {
  type        = string
  description = "AWSリージョン"
  default     = "ap-northeast-1"
}

variable "github_repo" {
  type        = string
  description = "GitHub リポジトリ（owner/repo 形式）。OIDC の sub 条件に使用する。"
}

variable "github_oidc_provider_arn" {
  type        = string
  description = "GitHub Actions OIDC プロバイダーの ARN。空文字の場合はアカウント内の既存プロバイダーを自動参照する。"
  default     = ""
}
