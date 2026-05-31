# ---------- ECS タスク実行ロール ----------
# ECR からのイメージ pull および CloudWatch Logs への書き込みを許可する

data "aws_iam_policy_document" "ecs_task_assume_role" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "ecs_task_execution" {
  name               = "${var.name_prefix}-ecs-task-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume_role.json

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-ecs-task-execution-role"
  })
}

# AWS 管理ポリシー: ECR pull + CloudWatch Logs
resource "aws_iam_role_policy_attachment" "ecs_task_execution_managed" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ---------- ECS タスクロール ----------
# アプリケーションコンテナが実行時に使用するロール
# Secrets Manager からシークレット値を取得する権限を付与する

resource "aws_iam_role" "ecs_task" {
  name               = "${var.name_prefix}-ecs-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume_role.json

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-ecs-task-role"
  })
}

data "aws_iam_policy_document" "ecs_task_secrets" {
  statement {
    sid    = "AllowSecretsManagerGet"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
    ]
    # リソースは ECS タスク定義側でシークレット ARN を明示して絞り込むため、
    # ここではプロジェクト・環境スコープのプレフィックスで制限する
    resources = [
      "arn:aws:secretsmanager:*:*:secret:${var.project}/${var.env}/*",
    ]
  }
}

resource "aws_iam_policy" "ecs_task_secrets" {
  name        = "${var.name_prefix}-ecs-task-secrets-policy"
  description = "ECS タスクが Secrets Manager からシークレットを取得するためのポリシー"
  policy      = data.aws_iam_policy_document.ecs_task_secrets.json

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-ecs-task-secrets-policy"
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_secrets" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = aws_iam_policy.ecs_task_secrets.arn
}

# ---------- GitHub Actions OIDC デプロイロール ----------
# GitHub Actions から OIDC でスイッチして ECR push / ECS デプロイを行うロール

data "aws_caller_identity" "current" {}

data "aws_iam_openid_connect_provider" "github" {
  count = var.github_oidc_provider_arn != "" ? 0 : 1
  url   = "https://token.actions.githubusercontent.com"
}

locals {
  oidc_provider_arn = var.github_oidc_provider_arn != "" ? var.github_oidc_provider_arn : data.aws_iam_openid_connect_provider.github[0].arn
}

data "aws_iam_policy_document" "github_actions_assume" {
  statement {
    effect = "Allow"
    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }
    actions = ["sts:AssumeRoleWithWebIdentity"]
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:*"]
    }
  }
}

resource "aws_iam_role" "github_actions_deploy" {
  name               = "${var.name_prefix}-github-actions-deploy-role"
  assume_role_policy = data.aws_iam_policy_document.github_actions_assume.json

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-github-actions-deploy-role"
  })
}

data "aws_iam_policy_document" "github_actions_deploy" {
  statement {
    sid    = "ECRAuth"
    effect = "Allow"
    actions = [
      "ecr:GetAuthorizationToken",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "ECRPush"
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:CompleteLayerUpload",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
    ]
    resources = [
      "arn:aws:ecr:${var.aws_region}:${data.aws_caller_identity.current.account_id}:repository/${var.project}/*",
    ]
  }

  statement {
    sid    = "ECSDescribe"
    effect = "Allow"
    actions = [
      "ecs:DescribeTaskDefinition",
      "ecs:DescribeServices",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "ECSDeployService"
    effect = "Allow"
    actions = [
      "ecs:RegisterTaskDefinition",
      "ecs:UpdateService",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "PassExecutionRole"
    effect = "Allow"
    actions = ["iam:PassRole"]
    resources = [
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/*",
    ]
  }
}

resource "aws_iam_policy" "github_actions_deploy" {
  name        = "${var.name_prefix}-github-actions-deploy-policy"
  description = "GitHub Actions が ECR push と ECS デプロイを行うためのポリシー"
  policy      = data.aws_iam_policy_document.github_actions_deploy.json

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-github-actions-deploy-policy"
  })
}

resource "aws_iam_role_policy_attachment" "github_actions_deploy" {
  role       = aws_iam_role.github_actions_deploy.name
  policy_arn = aws_iam_policy.github_actions_deploy.arn
}
