locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("_env/prod.hcl"))
  env      = local.env_vars.locals.env
  project  = local.env_vars.locals.project
}

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "${get_repo_root()}//modules/s3"
}

inputs = {
  env               = local.env
  random_suffix     = "live"
  enable_versioning = local.env_vars.locals.s3_enable_versioning
  common_tags = {
    Environment = local.env
    Project     = local.project
    ManagedBy   = "Terraform"
  }
}
