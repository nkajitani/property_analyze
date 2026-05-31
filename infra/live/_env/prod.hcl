locals {
  env     = "prod"
  project = "rei"
  region  = "ap-northeast-1"

  # ---------- VPC ----------
  vpc_cidr             = "10.0.0.0/16"
  public_subnet_cidrs  = ["10.0.0.0/24", "10.0.1.0/24"]
  private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24"]
  availability_zones   = ["ap-northeast-1a", "ap-northeast-1c"]
  # prod では NAT Gateway を有効化（ECS は Private Subnet に配置）
  enable_nat_gateway   = true

  # ---------- ECR ----------
  ecr_image_tag_mutability = "IMMUTABLE"
  ecr_scan_on_push         = true

  # ---------- RDS ----------
  rds_multi_az            = true
  db_instance_class       = "db.t4g.micro"
  rds_allocated_storage   = 20
  rds_deletion_protection = true

  # ---------- Secrets Manager ----------
  db_password_secret_name = "rei/prod/db_password"
  api_key_secret_name     = "rei/prod/api_key"

  # ---------- ACM / Route53 ----------
  # 例: root_domain_name = "example.com"
  #     domain_name      = "example.com"  （apex ドメイン運用の場合）
  # ※ apply 前に必ず設定すること
  root_domain_name = ""
  domain_name      = ""

  # ---------- CloudFront ----------
  cloudfront_price_class = "PriceClass_All"

  # ---------- S3 ----------
  s3_enable_versioning = true
}
