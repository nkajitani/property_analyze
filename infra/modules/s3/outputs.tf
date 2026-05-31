output "bucket_id" {
  description = "S3 バケットの ID（バケット名と同一）"
  value       = aws_s3_bucket.main.id
}

output "bucket_arn" {
  description = "S3 バケットの ARN"
  value       = aws_s3_bucket.main.arn
}

output "bucket_name" {
  description = "S3 バケット名"
  value       = aws_s3_bucket.main.bucket
}

output "bucket_regional_domain_name" {
  description = "S3 バケットのリージョン別ドメイン名（CloudFront Origin 設定用）"
  value       = aws_s3_bucket.main.bucket_regional_domain_name
}

output "public_access_block_id" {
  description = "S3 パブリックアクセスブロックのリソース ID（バケットポリシー適用前の depends_on 用）"
  value       = aws_s3_bucket_public_access_block.main.id
}
