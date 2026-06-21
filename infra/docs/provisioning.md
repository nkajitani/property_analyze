# プロビジョニング手順

## 前提条件

- AWS CLI が設定済みであること（`aws sts get-caller-identity` で確認）
- Terragrunt がインストール済みであること
- `nkajitani.com` ドメインをレジストラで所有済みであること

---

## ディレクトリ構成

```
live/dev/
  permanent/    ← 消さないリソース（課金が少額 or 無料）
    acm/            Route53 ホストゾーン + ACM 証明書
    acm_validation/ 証明書検証完了待ち
    ecr/            ECR リポジトリ
    iam/            GitHub Actions OIDC ロール
    s3/             S3 静的ファイルバケット
  runtime/      ← 開発時だけ起動（課金が高いもの）
    vpc/            VPC・サブネット・SG
    secretsmanager/ Secrets Manager
    rds/            RDS PostgreSQL
    alb/            ALB
    ecs/            ECS クラスター・サービス・タスク定義
    rds_sg_rule/    RDS セキュリティグループルール
    cloudfront/     CloudFront ディストリビューション
    s3_bucket_policy/ S3 バケットポリシー
```

## ユニット依存関係図

```mermaid
graph TD
    subgraph permanent
        acm["acm"]
        acm_validation["acm_validation"]
        ecr["ecr"]
        s3["s3"]
        iam["iam"]
    end

    subgraph runtime
        vpc["vpc"]
        secretsmanager["secretsmanager"]
        rds["rds"]
        alb["alb"]
        ecs["ecs"]
        rds_sg_rule["rds_sg_rule"]
        cloudfront["cloudfront"]
        s3_bucket_policy["s3_bucket_policy"]
    end

    acm --> acm_validation
    acm_validation --> alb
    acm_validation --> cloudfront
    acm --> cloudfront

    vpc --> rds
    vpc --> alb
    vpc --> ecs

    secretsmanager --> rds
    secretsmanager --> ecs

    ecr --> ecs

    alb --> ecs
    alb --> cloudfront

    rds --> ecs
    ecs --> rds_sg_rule

    s3 --> cloudfront
    s3 --> s3_bucket_policy
    cloudfront --> s3_bucket_policy
```

---

## 環境変数ファイルの設定

apply 前に環境ごとの変数ファイルを編集する。

**`live/_env/dev.hcl`**
```hcl
root_domain_name = "nkajitani.com"   # Route53 で管理するルートドメイン
domain_name      = "dev.nkajitani.com"  # dev 環境のサブドメイン
```

**`live/_env/prod.hcl`**
```hcl
root_domain_name = "nkajitani.com"
domain_name      = "nkajitani.com"   # prod は apex ドメインを使用する場合
```

---

## dev 環境のプロビジョニング手順

### Phase 1: permanent を apply する（初回のみ）

#### 1-1. ACM 証明書を作成する

```bash
cd /repo/infra/live/dev/permanent/acm
terragrunt apply
```

作成されるリソース:
- Route53 ホストゾーン（`nkajitani.com`）
- ACM 証明書 × 2（CloudFront 用: us-east-1 / ALB 用: ap-northeast-1）
- DNS 検証用 CNAME レコード

apply 完了後、ネームサーバーを確認する:

```bash
terragrunt output route53_name_servers
```

#### 1-2. レジストラの NS レコードを変更する

お名前.com にログインし、ネームサーバーを上記の4つの値に書き換える。

NS 伝播を確認する（AWS の NS が返ってくれば OK）:

```bash
dig NS nkajitani.com +short
```

> NS の伝播には通常 数十分〜数時間かかる。最大 48 時間。

#### 1-3. 証明書検証を完了させる

NS 伝播確認後に実行する。

```bash
cd /repo/infra/live/dev/permanent/acm_validation
terragrunt apply
```

#### 1-4. 残りの permanent を apply する

```bash
cd /repo/infra/live/dev/permanent/ecr && terragrunt apply
cd /repo/infra/live/dev/permanent/iam && terragrunt apply
cd /repo/infra/live/dev/permanent/s3 && terragrunt apply
```

---

### Phase 2: runtime を apply する（開発時）

```bash
cd /repo/infra/live/dev/runtime
terragrunt run-all apply
```

または個別に：

```bash
cd /repo/infra/live/dev/runtime/vpc && terragrunt apply
cd /repo/infra/live/dev/runtime/secretsmanager && terragrunt apply

# vpc + secretsmanager の完了後
cd /repo/infra/live/dev/runtime/rds && terragrunt apply

# vpc + acm_validation の完了後
cd /repo/infra/live/dev/runtime/alb && terragrunt apply

# alb + rds + ecr + vpc + secretsmanager の完了後
cd /repo/infra/live/dev/runtime/ecs && terragrunt apply

# ecs + rds の完了後
cd /repo/infra/live/dev/runtime/rds_sg_rule && terragrunt apply

# s3 + alb + acm_validation の完了後
cd /repo/infra/live/dev/runtime/cloudfront && terragrunt apply

# cloudfront + s3 の完了後
cd /repo/infra/live/dev/runtime/s3_bucket_policy && terragrunt apply
```

### Phase 3: Secrets Manager の値を設定する

apply 後に AWS コンソールまたは CLI で実際の値に更新する。

| シークレット名 | 設定する値 |
|--------------|-----------|
| `rei/dev/db_password` | RDS パスワード |
| `rei-dev/database_url` | `postgresql://rei_admin:パスワード@RDSエンドポイント:5432/rei_db?sslmode=require` |
| `rei-dev/admin_token` | 任意のトークン文字列 |

```bash
aws secretsmanager put-secret-value \
  --secret-id rei/dev/db_password \
  --secret-string "YourStrongPassword123!" \
  --region ap-northeast-1
```

> 使用可能文字: 英数字および `!#$%^&*()-_=+[]{}|;:,.<>?`  
> 使用不可文字: `/` `@` `"` スペース

---

## runtime の停止・再開

### 停止（コスト削減）

```bash
cd /repo/infra/live/dev/runtime
terragrunt run-all destroy
```

### 再開

```bash
cd /repo/infra/live/dev/runtime
terragrunt run-all apply
```

> permanent は残したままでよい。再開後は Secrets Manager の値が引き継がれるため Phase 3 は不要。

---

## 一括 apply / destroy（run-all）

### 概要

Terragrunt の `run-all` コマンドを使うと、ディレクトリ配下の全ユニットを依存関係順に一括で apply / destroy できる。

```bash
# dev 環境を一括 apply
cd /repo/infra/live/dev
terragrunt run-all apply

# dev 環境を一括 destroy
cd /repo/infra/live/dev
terragrunt run-all destroy
```

> `run-all` は非推奨になりつつあり、将来的には以下の書き方が推奨される。
> ```bash
> terragrunt apply --all
> terragrunt destroy --all
> ```

---

### 実行順序の確認

実際に apply / destroy する前に `--terragrunt-log-level info` で実行順序を確認できる。

```bash
terragrunt run-all apply --terragrunt-log-level info 2>&1 | grep "Group\|Unit"
```

出力例:
```
Group 1
- Unit ./acm
Group 2
- Unit ./vpc
- Unit ./secretsmanager
...
```

---

### 注意事項

#### 1. ECR・S3 はイメージ/オブジェクトが残っていると destroy できない

```
RepositoryNotEmptyException: The repository ... cannot be deleted because it still contains images
BucketNotEmpty: The bucket you tried to delete is not empty.
```

**対処：**
- ECR → AWS コンソール → ECR → リポジトリ → 「イメージをすべて削除」
- S3 → AWS コンソール → S3 → バケット → 「バケットを空にする」

その後、個別に destroy する。

```bash
cd /repo/infra/live/dev/ecr && terragrunt destroy
cd /repo/infra/live/dev/s3 && terragrunt destroy
```

#### 2. ECR・S3 はコストが低いので残しておいてよい

| リソース | 課金の性質 | destroy 優先度 |
|---------|-----------|---------------|
| RDS | 存在するだけで課金（高） | **高** |
| ALB | 存在するだけで課金（中） | **高** |
| ECS | タスクが0なら無料 | 低 |
| ECR | 保存イメージ分のみ（少額） | 低 |
| S3 | 保存データ分のみ（少額） | 低 |
| CloudFront | リクエストがなければほぼ無料 | 低 |

コスト削減が目的であれば **RDS と ALB だけ個別に destroy** するのが現実的。

```bash
cd /repo/infra/live/dev/ecs && terragrunt destroy
cd /repo/infra/live/dev/alb && terragrunt destroy
cd /repo/infra/live/dev/rds && terragrunt destroy
```

#### 3. 一括 destroy は依存エラーで途中停止することがある

依存先のアウトプットが既に消えている場合、後続ユニットがエラーになる。その場合は個別に destroy する。

```bash
# 依存の逆順で個別 destroy
cd /repo/infra/live/dev/s3_bucket_policy && terragrunt destroy
cd /repo/infra/live/dev/cloudfront && terragrunt destroy
cd /repo/infra/live/dev/rds_sg_rule && terragrunt destroy
cd /repo/infra/live/dev/ecs && terragrunt destroy
cd /repo/infra/live/dev/alb && terragrunt destroy
cd /repo/infra/live/dev/rds && terragrunt destroy
cd /repo/infra/live/dev/s3 && terragrunt destroy
cd /repo/infra/live/dev/ecr && terragrunt destroy
cd /repo/infra/live/dev/secretsmanager && terragrunt destroy
cd /repo/infra/live/dev/vpc && terragrunt destroy
cd /repo/infra/live/dev/acm_validation && terragrunt destroy
cd /repo/infra/live/dev/acm && terragrunt destroy
```

#### 4. acm は DNS 伝播待ちがあるため一括 apply に向かない

`acm` → `acm_validation` の間にレジストラの NS 設定とDNS伝播待ち（最大48時間）が必要。一括 apply を使う場合は Phase 1〜3 を手動で済ませてから残りを一括 apply する。

```bash
# Phase 1〜3 は手動
cd /repo/infra/live/dev/acm && terragrunt apply
# → レジストラで NS 設定・DNS 伝播確認
cd /repo/infra/live/dev/acm_validation && terragrunt apply

# Phase 4 以降は一括 apply
cd /repo/infra/live/dev
terragrunt run-all apply --terragrunt-exclude-dir acm --terragrunt-exclude-dir acm_validation
```

---

## よくあるエラーと対処

| エラー | 原因 | 対処 |
|--------|------|------|
| `certificate validation timeout` | NS がレジストラに反映されていない | `dig NS nkajitani.com` で NS を確認し、反映後に `acm_validation` を再 apply |
| `MasterUserPassword is not valid` | RDS パスワードに使用不可文字が含まれている | Secrets Manager の値を確認し、使用可能文字のみに変更する |
| `BucketAlreadyExists` | S3 バケット名が他アカウントと衝突 | `live/_env/dev.hcl` のプロジェクト名を変更する |
| `ResourceNotFoundException` (Secrets Manager) | RDS apply 前に Secrets Manager が作成されていない | `secretsmanager` → `rds` の順序で apply する |
