locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("_env/dev.hcl"))
  env      = local.env_vars.locals.env
  project  = local.env_vars.locals.project
}

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "${get_repo_root()}//modules/secretsmanager"
}

inputs = {
  name_prefix             = "${local.project}-${local.env}"
  project                 = local.project
  env                     = local.env
  db_password_secret_name = local.env_vars.locals.db_password_secret_name
  api_key_secret_name     = local.env_vars.locals.api_key_secret_name
  recovery_window_in_days = 0
  common_tags = {
    Environment = local.env
    Project     = local.project
    ManagedBy   = "Terraform"
  }
}
