locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("_env/dev.hcl"))
  env      = local.env_vars.locals.env
  project  = local.env_vars.locals.project
}

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "${get_repo_root()}//modules/alb"
}

dependency "vpc" {
  config_path = "../vpc"

  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
  mock_outputs = {
    vpc_id            = "vpc-00000000000000000"
    public_subnet_ids = ["subnet-00000000000000001", "subnet-00000000000000002"]
  }
}

dependency "acm_validation" {
  config_path = "../acm_validation"

  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
  mock_outputs = {
    alb_certificate_arn = "arn:aws:acm:ap-northeast-1:123456789012:certificate/mock-alb"
  }
}

inputs = {
  env                 = local.env
  vpc_id              = dependency.vpc.outputs.vpc_id
  public_subnet_ids   = dependency.vpc.outputs.public_subnet_ids
  acm_certificate_arn         = dependency.acm_validation.outputs.alb_certificate_arn
  frontend_container_port     = 3000
  common_tags = {
    Environment = local.env
    Project     = local.project
    ManagedBy   = "Terraform"
  }
}
