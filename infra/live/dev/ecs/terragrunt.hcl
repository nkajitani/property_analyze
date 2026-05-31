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
  source = "${get_repo_root()}//modules/ecs"
}

dependency "vpc" {
  config_path = "../vpc"

  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
  mock_outputs = {
    vpc_id             = "vpc-00000000000000000"
    public_subnet_ids  = ["subnet-00000000000000001", "subnet-00000000000000002"]
    private_subnet_ids = ["subnet-00000000000000003", "subnet-00000000000000004"]
  }
}

dependency "ecr" {
  config_path = "../ecr"

  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
  mock_outputs = {
    frontend_repository_url = "123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/rei/frontend"
    backend_repository_url  = "123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/rei/backend"
  }
}

dependency "alb" {
  config_path = "../alb"

  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
  mock_outputs = {
    security_group_id        = "sg-00000000000000001"
    frontend_target_group_arn = "arn:aws:elasticloadbalancing:ap-northeast-1:123456789012:targetgroup/mock-frontend/0000000000000001"
    backend_target_group_arn  = "arn:aws:elasticloadbalancing:ap-northeast-1:123456789012:targetgroup/mock-backend/0000000000000002"
  }
}

dependency "rds" {
  config_path = "../rds"

  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
  mock_outputs = {
    db_instance_address = "mock-rds.ap-northeast-1.rds.amazonaws.com"
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
  env                       = local.env
  vpc_id                    = dependency.vpc.outputs.vpc_id
  public_subnet_ids         = dependency.vpc.outputs.public_subnet_ids
  private_subnet_ids        = dependency.vpc.outputs.private_subnet_ids
  enable_nat_gateway        = local.env_vars.locals.enable_nat_gateway
  alb_security_group_id     = dependency.alb.outputs.security_group_id
  frontend_target_group_arn = dependency.alb.outputs.frontend_target_group_arn
  backend_target_group_arn  = dependency.alb.outputs.backend_target_group_arn
  ecr_frontend_image        = "${dependency.ecr.outputs.frontend_repository_url}:latest"
  ecr_backend_image         = "${dependency.ecr.outputs.backend_repository_url}:latest"
  db_secret_arn             = dependency.secretsmanager.outputs.db_password_secret_arn
  db_host                   = dependency.rds.outputs.db_instance_address
  aws_region                = local.region
  common_tags = {
    Environment = local.env
    Project     = local.project
    ManagedBy   = "Terraform"
  }
}
