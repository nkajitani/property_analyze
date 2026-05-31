variable "env" {
  type        = string
  description = "デプロイ環境名（dev / prod）"
}

variable "common_tags" {
  type        = map(string)
  description = "全リソースに付与する共通タグ"
  default     = {}
}

variable "enable_versioning" {
  type        = bool
  description = "S3 バケットのバージョニングを有効化するか"
  default     = false
}

variable "random_suffix" {
  type        = string
  description = "バケット名の衝突を避けるためのランダムサフィックス文字列"
}
