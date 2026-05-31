#!/bin/bash
# GeoJSON ファイルを S3 にアップロードする
# 使い方: ./scripts/upload_geo.sh dev

ENV=${1:-dev}
BUCKET="rei-static-${ENV}-live"
GEO_DIR="/data/geo"

aws s3 cp "${GEO_DIR}/municipalities.geojson" \
  "s3://${BUCKET}/geo/municipalities.geojson" \
  --content-type "application/json" \
  --cache-control "public, max-age=86400"

aws s3 cp "${GEO_DIR}/towns.geojson" \
  "s3://${BUCKET}/geo/towns.geojson" \
  --content-type "application/json" \
  --cache-control "public, max-age=86400"

echo "アップロード完了: s3://${BUCKET}/geo/"
