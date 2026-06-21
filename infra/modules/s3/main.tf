locals {
  bucket_name = "rei-static-${var.env}-${var.random_suffix}"
  tags        = merge(var.common_tags, { Module = "s3" })
}

import {
  id = local.bucket_name
  to = aws_s3_bucket.main
}

import {
  id = local.bucket_name
  to = aws_s3_bucket_public_access_block.main
}

import {
  id = local.bucket_name
  to = aws_s3_bucket_versioning.main
}

import {
  id = local.bucket_name
  to = aws_s3_bucket_server_side_encryption_configuration.main
}

# ---------------------------------------------------------------------------
# S3 Bucket（静的アセット用）
# ---------------------------------------------------------------------------
resource "aws_s3_bucket" "main" {
  bucket = local.bucket_name

  tags = merge(local.tags, { Name = local.bucket_name })
}

# ---------------------------------------------------------------------------
# パブリックアクセスブロック: すべてブロック
# ---------------------------------------------------------------------------
resource "aws_s3_bucket_public_access_block" "main" {
  bucket = aws_s3_bucket.main.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ---------------------------------------------------------------------------
# バージョニング
# ---------------------------------------------------------------------------
resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.main.id

  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Suspended"
  }
}

# ---------------------------------------------------------------------------
# サーバーサイド暗号化
# ---------------------------------------------------------------------------
resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# ---------------------------------------------------------------------------
# ライフサイクルルール: 古いバージョンを自動削除（バージョニング有効時）
# ---------------------------------------------------------------------------
resource "aws_s3_bucket_lifecycle_configuration" "main" {
  count  = var.enable_versioning ? 1 : 0
  bucket = aws_s3_bucket.main.id

  rule {
    id     = "expire-noncurrent-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
