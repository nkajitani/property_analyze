# ルート terragrunt.hcl
# すべての unit が find_in_parent_folders() で自動的にこのファイルを参照する。
# remote_state と generate による providers.tf の DRY 化を担う。

locals {
  # live/{env}/{unit} の構造から env を自動抽出する
  env_path = split("/", path_relative_to_include())
  env      = local.env_path[1]  # live/dev/vpc → "dev"

  project = "rei"
  region  = "ap-northeast-1"
}

# ---------------------------------------------------------------------------
# Remote State: unit ごとに独立した state ファイルを S3 に配置
# バケット・ロックファイルは Terragrunt が自動作成する
# ---------------------------------------------------------------------------
remote_state {
  backend = "s3"

  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }

  config = {
    bucket       = "${local.project}-tfstate-${local.env}"
    key          = "${path_relative_to_include()}/terraform.tfstate"
    region       = local.region
    encrypt      = true
    use_lockfile = true

    s3_bucket_tags = {
      Project     = local.project
      Environment = local.env
      ManagedBy   = "Terragrunt"
    }
  }
}

# ---------------------------------------------------------------------------
# generate: providers.tf を各 unit に自動生成する
# ---------------------------------------------------------------------------
generate "providers" {
  path      = "providers.tf"
  if_exists = "overwrite_terragrunt"

  contents = <<-EOF
    provider "aws" {
      region = "${local.region}"

      default_tags {
        tags = {
          Environment = "${local.env}"
          Project     = "${local.project}"
          ManagedBy   = "Terraform"
        }
      }
    }

    provider "aws" {
      alias  = "us_east_1"
      region = "us-east-1"

      default_tags {
        tags = {
          Environment = "${local.env}"
          Project     = "${local.project}"
          ManagedBy   = "Terraform"
        }
      }
    }
  EOF
}
