locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("_env/dev.hcl"))
  env      = local.env_vars.locals.env
  project  = local.env_vars.locals.project
}

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "${get_repo_root()}//modules/acm_validation"
}

# acm_validation は us-east-1 プロバイダーが必要
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

dependency "acm" {
  config_path = "../acm"

  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
  mock_outputs = {
    cloudfront_certificate_arn          = "arn:aws:acm:us-east-1:123456789012:certificate/mock-cf"
    alb_certificate_arn                 = "arn:aws:acm:ap-northeast-1:123456789012:certificate/mock-alb"
    cloudfront_validation_record_fqdns  = ["_mock.dev.nkajitani.com"]
    alb_validation_record_fqdns         = ["_mock.dev.nkajitani.com"]
  }
}

inputs = {
  env                                = local.env
  cloudfront_certificate_arn         = dependency.acm.outputs.cloudfront_certificate_arn
  alb_certificate_arn                = dependency.acm.outputs.alb_certificate_arn
  cloudfront_validation_record_fqdns = dependency.acm.outputs.cloudfront_validation_record_fqdns
  alb_validation_record_fqdns        = dependency.acm.outputs.alb_validation_record_fqdns
  common_tags = {
    Environment = local.env
    Project     = local.project
    ManagedBy   = "Terraform"
  }
}
