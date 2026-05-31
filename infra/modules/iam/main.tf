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
