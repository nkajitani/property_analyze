variable "env" {
  type        = string
  description = "デプロイ環境名（dev / prod）"
}

variable "common_tags" {
  type        = map(string)
  description = "全リソースに付与する共通タグ"
  default     = {}
}

variable "domain_name" {
  type        = string
  description = "ACM 証明書を発行するドメイン名（空文字の場合はリソースを作成しない）"
  default     = ""
}

variable "root_domain_name" {
  type        = string
  description = "Route53 ホストゾーンのルートドメイン名（例: example.com）。空文字の場合は domain_name をそのまま使用する"
  default     = ""
}

variable "subject_alternative_names" {
  type        = list(string)
  description = "証明書に含める追加ドメイン名のリスト（SANs）"
  default     = []
}
