locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("_env/prod.hcl"))
  env      = local.env_vars.locals.env
  project  = local.env_vars.locals.project
}

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "${get_repo_root()}//modules/cloudfront"
}

dependency "s3" {
  config_path = "../s3"

  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
  mock_outputs = {
    bucket_id                   = "rei-static-prod-mock"
    bucket_regional_domain_name = "rei-static-prod-mock.s3.ap-northeast-1.amazonaws.com"
  }
}

dependency "alb" {
  config_path = "../alb"

  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
  mock_outputs = {
    alb_dns_name = "mock-alb.ap-northeast-1.elb.amazonaws.com"
  }
}

dependency "acm_validation" {
  config_path = "../acm_validation"

  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
  mock_outputs = {
    cloudfront_certificate_arn = ""
  }
}

dependency "acm" {
  config_path = "../acm"

  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
  mock_outputs = {
    route53_zone_id = "ZXXXXXXXXXXXXXXXXX"
  }
}

inputs = {
  env                            = local.env
  s3_bucket_regional_domain_name = dependency.s3.outputs.bucket_regional_domain_name
  s3_bucket_id                   = dependency.s3.outputs.bucket_id
  alb_dns_name                   = dependency.alb.outputs.alb_dns_name
  acm_certificate_arn            = dependency.acm_validation.outputs.cloudfront_certificate_arn
  aliases                        = local.env_vars.locals.domain_name != "" ? [local.env_vars.locals.domain_name] : []
  route53_zone_id                = dependency.acm.outputs.route53_zone_id
  price_class                    = local.env_vars.locals.cloudfront_price_class
  common_tags = {
    Environment = local.env
    Project     = local.project
    ManagedBy   = "Terraform"
  }
}
