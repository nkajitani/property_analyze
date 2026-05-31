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
