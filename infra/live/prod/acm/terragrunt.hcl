locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("_env/prod.hcl"))
  env      = local.env_vars.locals.env
  project  = local.env_vars.locals.project
}

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "${get_repo_root()}//modules/acm"
}

generate "acm_provider" {
  path      = "acm_provider_override.tf"
  if_exists = "overwrite_terragrunt"

  contents = <<-EOF
    terraform {
      required_providers {
        aws = {
          source  = "hashicorp/aws"
          version = "~> 5.0"
          configuration_aliases = [aws.us_east_1]
        }
      }
    }
  EOF
}

inputs = {
  env              = local.env
  domain_name      = local.env_vars.locals.domain_name
  root_domain_name = local.env_vars.locals.root_domain_name
  common_tags = {
    Environment = local.env
    Project     = local.project
    ManagedBy   = "Terraform"
  }
}
