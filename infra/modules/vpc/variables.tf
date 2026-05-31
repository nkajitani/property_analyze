variable "name_prefix" {
  type        = string
  description = "リソース名のプレフィックス（{project}-{env} 形式）"
}

variable "vpc_cidr" {
  type        = string
  description = "VPC の CIDR ブロック"
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "パブリックサブネットの CIDR ブロック一覧"
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "プライベートサブネットの CIDR ブロック一覧"
}

variable "availability_zones" {
  type        = list(string)
  description = "使用するアベイラビリティゾーン一覧"
}

variable "enable_nat_gateway" {
  type        = bool
  description = "NAT Gateway を作成するかどうか"
}

variable "common_tags" {
  type        = map(string)
  description = "全リソースに付与する共通タグ"
}
