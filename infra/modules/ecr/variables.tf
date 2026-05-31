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

variable "ecr_image_tag_mutability" {
  type        = string
  description = "ECR イメージタグの変更可否（MUTABLE / IMMUTABLE）"
}

variable "ecr_scan_on_push" {
  type        = bool
  description = "ECR へのプッシュ時に脆弱性スキャンを実行するかどうか"
}

variable "common_tags" {
  type        = map(string)
  description = "全リソースに付与する共通タグ"
}
