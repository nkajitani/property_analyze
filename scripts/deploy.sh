#!/usr/bin/env bash
# ローカルから dev 環境へ手動デプロイするスクリプト
# 前提: AWS CLI の認証が設定済みであること (aws sts get-caller-identity で確認)
#
# 使い方:
#   ./scripts/deploy.sh                  # frontend + backend 両方
#   ./scripts/deploy.sh frontend         # frontend のみ
#   ./scripts/deploy.sh backend          # backend のみ

set -euo pipefail

PROJECT="rei"
ENV="dev"
REGION="ap-northeast-1"
SERVICES=("frontend" "backend")

# 引数で対象サービスを絞る
if [[ $# -ge 1 ]]; then
  SERVICES=("$@")
fi

# ECR レジストリ URL を取得
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# ECR ログイン
echo "==> Logging in to ECR..."
aws ecr get-login-password --region "${REGION}" \
  | docker login --username AWS --password-stdin "${REGISTRY}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

GIT_SHA=$(git -C "${REPO_ROOT}" rev-parse --short HEAD)

for SERVICE in "${SERVICES[@]}"; do
  echo ""
  echo "==> [$SERVICE] Building image..."
  IMAGE_REPO="${REGISTRY}/${PROJECT}/${SERVICE}"
  docker build \
    -t "${IMAGE_REPO}:latest" \
    -t "${IMAGE_REPO}:${GIT_SHA}" \
    "${REPO_ROOT}/app/${SERVICE}"

  echo "==> [$SERVICE] Pushing to ECR..."
  docker push "${IMAGE_REPO}:latest"
  docker push "${IMAGE_REPO}:${GIT_SHA}"

  echo "==> [$SERVICE] Updating ECS task definition..."
  FAMILY="rei-${SERVICE}-${ENV}"
  CLUSTER="rei-ecs-${ENV}"
  ECS_SERVICE="rei-${SERVICE}-${ENV}"
  CONTAINER="${SERVICE}"

  # 現在のタスク定義を取得
  TASKDEF=$(aws ecs describe-task-definition \
    --task-definition "${FAMILY}" \
    --query taskDefinition)

  # イメージを差し替えた新しいタスク定義を登録
  NEW_TASKDEF=$(echo "${TASKDEF}" | python3 - <<'PYEOF'
import json, sys
td = json.load(sys.stdin)
for key in ['taskDefinitionArn','revision','status','requiresAttributes',
            'compatibilities','registeredAt','registeredBy']:
    td.pop(key, None)
print(json.dumps(td))
PYEOF
)

  CONTAINER_NAME="${CONTAINER}"
  NEW_IMAGE="${IMAGE_REPO}:latest"

  RENDERED=$(echo "${NEW_TASKDEF}" | python3 - "${CONTAINER_NAME}" "${NEW_IMAGE}" <<'PYEOF'
import json, sys
td = json.load(sys.stdin)
container_name = sys.argv[1]
new_image = sys.argv[2]
for c in td['containerDefinitions']:
    if c['name'] == container_name:
        c['image'] = new_image
print(json.dumps(td))
PYEOF
)

  NEW_ARN=$(aws ecs register-task-definition \
    --cli-input-json "${RENDERED}" \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

  echo "==> [$SERVICE] Registered new task definition: ${NEW_ARN}"

  echo "==> [$SERVICE] Updating ECS service..."
  aws ecs update-service \
    --cluster "${CLUSTER}" \
    --service "${ECS_SERVICE}" \
    --task-definition "${NEW_ARN}" \
    --output text --query 'service.serviceName'

  echo "==> [$SERVICE] Waiting for service to stabilize..."
  aws ecs wait services-stable \
    --cluster "${CLUSTER}" \
    --services "${ECS_SERVICE}"

  echo "==> [$SERVICE] Deploy complete."
done

echo ""
echo "All done."
