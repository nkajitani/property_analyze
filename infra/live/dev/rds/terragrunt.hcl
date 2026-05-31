locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("_env/dev.hcl"))
  env      = local.env_vars.locals.env
  project  = local.env_vars.locals.project
}

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "${get_repo_root()}//modules/rds"
}

dependency "vpc" {
  config_path = "../vpc"

  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
  mock_outputs = {
    vpc_id             = "vpc-00000000000000000"
    private_subnet_ids = ["subnet-00000000000000001", "subnet-00000000000000002"]
  }
}

dependency "secretsmanager" {
  config_path = "../secretsmanager"

  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
  mock_outputs = {
    db_password_secret_arn = "arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:mock"
  }
}

inputs = {
  env                    = local.env
  vpc_id                 = dependency.vpc.outputs.vpc_id
  private_subnet_ids     = dependency.vpc.outputs.private_subnet_ids
  db_instance_class      = local.env_vars.locals.db_instance_class
  rds_multi_az           = local.env_vars.locals.rds_multi_az
  db_password_secret_arn = dependency.secretsmanager.outputs.db_password_secret_arn
  allocated_storage      = local.env_vars.locals.rds_allocated_storage
  deletion_protection    = local.env_vars.locals.rds_deletion_protection
  common_tags = {
    Environment = local.env
    Project     = local.project
    ManagedBy   = "Terraform"
  }
}
