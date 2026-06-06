# ---------- DB パスワードシークレット ----------
# 初期値は空文字列とし、実際の値は AWS コンソールまたは CI/CD パイプラインで設定する

resource "aws_secretsmanager_secret" "db_password" {
  name                    = var.db_password_secret_name
  description             = "${var.project} ${var.env} 環境の DB パスワード"
  recovery_window_in_days = var.recovery_window_in_days

  tags = merge(var.common_tags, {
    Name    = var.db_password_secret_name
    Purpose = "db-password"
  })
}

# シークレットのバージョン（初期プレースホルダー）
# 実運用では terraform 管理外でローテーションすることを推奨
resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id = aws_secretsmanager_secret.db_password.id
  # 初期値はプレースホルダー。apply 後に AWS コンソール or CLI で有効なパスワードに変更すること
  # 使用可能文字: 英数字および !#$%^&*()-_=+[]{}|;:,.<>?  （/ @ " スペースは不可）
  secret_string = "CHANGE_ME_ReplaceWithStrongPassword1"

  lifecycle {
    # 初回作成後は Terraform による上書きを防ぐ（手動またはローテーションで更新）
    ignore_changes = [secret_string]
  }
}

# ---------- DATABASE_URL シークレット ----------

resource "aws_secretsmanager_secret" "database_url" {
  name                    = "${var.name_prefix}/database_url"
  description             = "${var.project} ${var.env} 環境の DATABASE_URL"
  recovery_window_in_days = var.recovery_window_in_days

  tags = merge(var.common_tags, {
    Name    = "${var.name_prefix}/database_url"
    Purpose = "database-url"
  })
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = "CHANGE_ME"

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ---------- ADMIN_TOKEN シークレット ----------

resource "aws_secretsmanager_secret" "admin_token" {
  name                    = "${var.name_prefix}/admin_token"
  description             = "${var.project} ${var.env} 環境の ADMIN_TOKEN"
  recovery_window_in_days = var.recovery_window_in_days

  tags = merge(var.common_tags, {
    Name    = "${var.name_prefix}/admin_token"
    Purpose = "admin-token"
  })
}

resource "aws_secretsmanager_secret_version" "admin_token" {
  secret_id     = aws_secretsmanager_secret.admin_token.id
  secret_string = "CHANGE_ME"

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ---------- API キーシークレット ----------

resource "aws_secretsmanager_secret" "api_key" {
  name                    = var.api_key_secret_name
  description             = "${var.project} ${var.env} 環境の API キー"
  recovery_window_in_days = var.recovery_window_in_days

  tags = merge(var.common_tags, {
    Name    = var.api_key_secret_name
    Purpose = "api-key"
  })
}

resource "aws_secretsmanager_secret_version" "api_key" {
  secret_id = aws_secretsmanager_secret.api_key.id
  secret_string = jsonencode({
    api_key = "CHANGE_ME"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}
