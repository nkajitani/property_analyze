locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("_env/prod.hcl"))
  env      = local.env_vars.locals.env
  project  = local.env_vars.locals.project
}

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "${get_repo_root()}//modules/vpc"
}

inputs = {
  name_prefix          = "${local.project}-${local.env}"
  vpc_cidr             = local.env_vars.locals.vpc_cidr
  public_subnet_cidrs  = local.env_vars.locals.public_subnet_cidrs
  private_subnet_cidrs = local.env_vars.locals.private_subnet_cidrs
  availability_zones   = local.env_vars.locals.availability_zones
  enable_nat_gateway   = local.env_vars.locals.enable_nat_gateway
  common_tags = {
    Environment = local.env
    Project     = local.project
    ManagedBy   = "Terraform"
  }
}
