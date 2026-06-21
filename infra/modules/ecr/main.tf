locals {
  # リポジトリ定義: キーはロジカル名、値はリポジトリパス
  repositories = {
    frontend = "${var.project}/frontend"
    backend  = "${var.project}/backend"
  }
}

import {
  for_each = local.repositories
  id       = each.value
  to       = aws_ecr_repository.main[each.key]
}

resource "aws_ecr_repository" "main" {
  for_each = local.repositories

  name                 = each.value
  image_tag_mutability = var.ecr_image_tag_mutability

  image_scanning_configuration {
    scan_on_push = var.ecr_scan_on_push
  }

  # イメージの暗号化（デフォルトは AES256）
  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = merge(var.common_tags, {
    Name = each.value
  })
}

# ---------- ライフサイクルポリシー ----------
# 非本番タグのないイメージを最大 30 世代に制限し、ストレージコストを抑える

resource "aws_ecr_lifecycle_policy" "main" {
  for_each = aws_ecr_repository.main

  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "最新 30 世代を超えた untagged イメージを削除"
        selection = {
          tagStatus   = "untagged"
          countType   = "imageCountMoreThan"
          countNumber = 30
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
