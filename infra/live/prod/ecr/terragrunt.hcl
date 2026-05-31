locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("_env/prod.hcl"))
  env      = local.env_vars.locals.env
  project  = local.env_vars.locals.project
}

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "${get_repo_root()}//modules/ecr"
}

inputs = {
  name_prefix              = "${local.project}-${local.env}"
  project                  = local.project
  env                      = local.env
  ecr_image_tag_mutability = local.env_vars.locals.ecr_image_tag_mutability
  ecr_scan_on_push         = local.env_vars.locals.ecr_scan_on_push
  common_tags = {
    Environment = local.env
    Project     = local.project
    ManagedBy   = "Terraform"
  }
}
