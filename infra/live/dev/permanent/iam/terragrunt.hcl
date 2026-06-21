locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("_env/dev.hcl"))
  env      = local.env_vars.locals.env
  project  = local.env_vars.locals.project
  region   = local.env_vars.locals.region
}

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "${get_repo_root()}//modules/iam"
}

inputs = {
  name_prefix = "${local.project}-${local.env}"
  env         = local.env
  project     = local.project
  aws_region  = local.region

  # GitHub リポジトリ（owner/repo 形式）
  # 例: "your-org/your-repo"
  github_repo = local.env_vars.locals.github_repo

  # GitHub OIDC プロバイダーが既にアカウントに存在する場合は ARN を指定する。
  # 存在しない場合は空文字のままにすると自動参照する。
  github_oidc_provider_arn = ""

  common_tags = {
    Environment = local.env
    Project     = local.project
    ManagedBy   = "Terraform"
  }
}
