variable "bucket_id" {
  type        = string
  description = "ポリシーを適用する S3 バケットの ID"
}

variable "bucket_arn" {
  type        = string
  description = "ポリシーを適用する S3 バケットの ARN"
}

variable "cloudfront_distribution_arn" {
  type        = string
  description = "OAC 経由でバケットにアクセスする CloudFront Distribution の ARN"
}
