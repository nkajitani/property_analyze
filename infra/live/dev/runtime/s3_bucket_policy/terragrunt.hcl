locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("_env/dev.hcl"))
  env      = local.env_vars.locals.env
  project  = local.env_vars.locals.project
}

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "${get_repo_root()}//modules/s3_bucket_policy"
}

dependency "s3" {
  config_path = "../../permanent/s3"

  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
  mock_outputs = {
    bucket_id  = "rei-static-dev-mock"
    bucket_arn = "arn:aws:s3:::rei-static-dev-mock"
  }
}

dependency "cloudfront" {
  config_path = "../../runtime/cloudfront"

  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
  mock_outputs = {
    distribution_arn = "arn:aws:cloudfront::123456789012:distribution/MOCK"
  }
}

inputs = {
  bucket_id                   = dependency.s3.outputs.bucket_id
  bucket_arn                  = dependency.s3.outputs.bucket_arn
  cloudfront_distribution_arn = dependency.cloudfront.outputs.distribution_arn
}
