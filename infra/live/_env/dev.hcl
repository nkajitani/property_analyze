locals {
  env     = "dev"
  project = "rei"
  region  = "ap-northeast-1"

  # ---------- VPC ----------
  vpc_cidr             = "10.0.0.0/16"
  public_subnet_cidrs  = ["10.0.0.0/24", "10.0.1.0/24"]
  private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24"]
  availability_zones   = ["ap-northeast-1a", "ap-northeast-1c"]
  # dev では NAT Gateway を省略してコスト削減（ECS は Public Subnet に配置）
  enable_nat_gateway   = false

  # ---------- ECR ----------
  ecr_image_tag_mutability = "MUTABLE"
  ecr_scan_on_push         = true

  # ---------- RDS ----------
  rds_multi_az            = false
  db_instance_class       = "db.t4g.micro"
  rds_allocated_storage   = 20
  rds_deletion_protection = false

  # ---------- Secrets Manager ----------
  db_password_secret_name = "rei/dev/db_password"
  api_key_secret_name     = "rei/dev/api_key"

  # ---------- ACM / Route53 ----------
  # 例: root_domain_name = "example.com"
  #     domain_name      = "dev.example.com"  （サブドメイン運用の場合）
  # ※ root_domain_name を設定すると Route53 ホストゾーンがこのプロジェクトで管理される
  # ※ 空文字のままの場合は ACM・Route53 リソースを作成しない（apply 前に必ず設定すること）
  root_domain_name = "nkajitani.com"
  domain_name      = "dev.nkajitani.com"

  # ---------- CloudFront ----------
  cloudfront_price_class = "PriceClass_All"

  # ---------- S3 ----------
  s3_enable_versioning = false

  # ---------- GitHub Actions OIDC ----------
  # GitHub リポジトリ（owner/repo 形式）に書き換えてください
  github_repo = "nkajitani/property_analyze"
}
