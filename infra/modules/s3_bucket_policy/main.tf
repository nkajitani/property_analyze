data "aws_iam_policy_document" "main" {
  statement {
    sid    = "AllowCloudFrontOACGetObject"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${var.bucket_arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [var.cloudfront_distribution_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "main" {
  bucket = var.bucket_id
  policy = data.aws_iam_policy_document.main.json
}
