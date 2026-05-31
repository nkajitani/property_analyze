locals {
  name_prefix          = "rei-cf-${var.env}"
  use_custom_cert      = var.acm_certificate_arn != "" && length(var.aliases) > 0
  s3_origin_id         = "S3StaticOrigin"
  alb_origin_id        = "ALBOrigin"
  tags                 = merge(var.common_tags, { Module = "cloudfront" })
}

# ---------------------------------------------------------------------------
# Origin Access Control（OAC）
# ---------------------------------------------------------------------------
resource "aws_cloudfront_origin_access_control" "main" {
  name                              = "${local.name_prefix}-oac"
  description                       = "OAC for rei static assets S3 bucket (${var.env})"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ---------------------------------------------------------------------------
# Cache Policies
# ---------------------------------------------------------------------------

# 静的アセット用: 長期キャッシュ（TTL=1年、immutable）
resource "aws_cloudfront_cache_policy" "static_assets" {
  name        = "${local.name_prefix}-static-assets-cache-policy"
  comment     = "Cache policy for static assets with 1 year TTL"
  min_ttl     = 0
  default_ttl = var.static_ttl
  max_ttl     = var.static_ttl

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# API / デフォルト用: キャッシュなし（TTL=0、常にオリジンへ転送）
resource "aws_cloudfront_cache_policy" "no_cache" {
  name        = "${local.name_prefix}-no-cache-policy"
  comment     = "No-cache policy for API and dynamic content"
  min_ttl     = 0
  default_ttl = 0
  max_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

# ---------------------------------------------------------------------------
# Origin Request Policy: ALB にヘッダー・クエリ・Cookie を転送する
# ---------------------------------------------------------------------------
resource "aws_cloudfront_origin_request_policy" "alb_forward_all" {
  name    = "${local.name_prefix}-alb-forward-all"
  comment = "Forward all headers, cookies, and query strings to ALB"

  cookies_config {
    cookie_behavior = "all"
  }

  headers_config {
    header_behavior = "allViewer"
  }

  query_strings_config {
    query_string_behavior = "all"
  }
}

# ---------------------------------------------------------------------------
# CloudFront Distribution
# ---------------------------------------------------------------------------
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  comment             = "rei property-analyze distribution (${var.env})"
  price_class         = var.price_class
  aliases             = local.use_custom_cert ? var.aliases : []
  http_version        = "http2and3"
  is_ipv6_enabled     = true
  web_acl_id          = var.web_acl_id != "" ? var.web_acl_id : null
  default_root_object = "index.html"

  # ------------------------------------------------------------------
  # Origin: S3（静的アセット）
  # ------------------------------------------------------------------
  origin {
    domain_name              = var.s3_bucket_regional_domain_name
    origin_id                = local.s3_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.main.id
  }

  # ------------------------------------------------------------------
  # Origin: ALB（API / フロントエンドアプリ）
  # ------------------------------------------------------------------
  origin {
    domain_name = var.alb_dns_name
    origin_id   = local.alb_origin_id

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
      origin_read_timeout    = 30
      origin_keepalive_timeout = 5
    }
  }

  # ------------------------------------------------------------------
  # Cache Behavior: /geo/* → S3（TTL=1年）
  # ------------------------------------------------------------------
  ordered_cache_behavior {
    path_pattern             = "/geo/*"
    target_origin_id         = local.s3_origin_id
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = aws_cloudfront_cache_policy.static_assets.id
    compress                 = true
  }

  # ------------------------------------------------------------------
  # Cache Behavior: /_next/static/* → S3（TTL=1年、immutable）
  # ------------------------------------------------------------------
  ordered_cache_behavior {
    path_pattern             = "/_next/static/*"
    target_origin_id         = local.s3_origin_id
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = aws_cloudfront_cache_policy.static_assets.id
    compress                 = true

    response_headers_policy_id = aws_cloudfront_response_headers_policy.immutable.id
  }

  # ------------------------------------------------------------------
  # Cache Behavior: /api/* → ALB（No-cache）
  # ------------------------------------------------------------------
  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = local.alb_origin_id
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = aws_cloudfront_cache_policy.no_cache.id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.alb_forward_all.id
    compress                 = true
  }

  # ------------------------------------------------------------------
  # Default Cache Behavior: /* → ALB（TTL=0 or 短期）
  # ------------------------------------------------------------------
  default_cache_behavior {
    target_origin_id         = local.alb_origin_id
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = aws_cloudfront_cache_policy.no_cache.id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.alb_forward_all.id
    compress                 = true
  }

  # ------------------------------------------------------------------
  # 証明書設定
  # ------------------------------------------------------------------
  viewer_certificate {
    acm_certificate_arn            = local.use_custom_cert ? var.acm_certificate_arn : null
    ssl_support_method             = local.use_custom_cert ? "sni-only" : null
    minimum_protocol_version       = local.use_custom_cert ? "TLSv1.2_2021" : "TLSv1"
    cloudfront_default_certificate = local.use_custom_cert ? false : true
  }

  # ------------------------------------------------------------------
  # アクセスログ（任意）
  # ------------------------------------------------------------------
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = merge(local.tags, { Name = local.name_prefix })
}

# ---------------------------------------------------------------------------
# Route53 Alias レコード（aliases が設定されている場合のみ作成）
# ---------------------------------------------------------------------------
resource "aws_route53_record" "aliases" {
  for_each = (
    local.use_custom_cert && var.route53_zone_id != ""
    ? { for alias in var.aliases : alias => alias }
    : {}
  )

  zone_id = var.route53_zone_id
  name    = each.value
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

# ---------------------------------------------------------------------------
# Response Headers Policy: Cache-Control: immutable（/_next/static/* 用）
# ---------------------------------------------------------------------------
resource "aws_cloudfront_response_headers_policy" "immutable" {
  name    = "${local.name_prefix}-immutable-headers"
  comment = "Add Cache-Control: max-age=31536000, immutable for Next.js static assets"

  custom_headers_config {
    items {
      header   = "Cache-Control"
      value    = "public, max-age=31536000, immutable"
      override = true
    }
  }
}
