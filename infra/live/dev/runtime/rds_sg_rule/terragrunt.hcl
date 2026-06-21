locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("_env/dev.hcl"))
  env      = local.env_vars.locals.env
  project  = local.env_vars.locals.project
}

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "${get_repo_root()}//modules/rds_sg_rule"
}

dependency "rds" {
  config_path = "../../runtime/rds"

  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
  mock_outputs = {
    security_group_id = "sg-00000000000000001"
  }
}

dependency "ecs" {
  config_path = "../../runtime/ecs"

  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
  mock_outputs = {
    backend_security_group_id = "sg-00000000000000002"
  }
}

inputs = {
  rds_security_group_id         = dependency.rds.outputs.security_group_id
  ecs_backend_security_group_id = dependency.ecs.outputs.backend_security_group_id
}
