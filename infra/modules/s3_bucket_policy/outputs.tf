output "bucket_policy_id" {
  description = "適用された S3 バケットポリシーのバケット ID"
  value       = aws_s3_bucket_policy.main.id
}
