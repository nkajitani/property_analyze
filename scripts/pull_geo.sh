#!/bin/bash
# S3 から GeoJSON ファイルをローカルにダウンロードする
# 使い方: ./scripts/pull_geo.sh dev

ENV=${1:-dev}
BUCKET="rei-static-${ENV}-live"
GEO_DIR="/data/geo"

mkdir -p "${GEO_DIR}"

aws s3 cp "s3://${BUCKET}/geo/municipalities.geojson" \
  "${GEO_DIR}/municipalities.geojson"

aws s3 cp "s3://${BUCKET}/geo/towns.geojson" \
  "${GEO_DIR}/towns.geojson"

echo "ダウンロード完了: ${GEO_DIR}/"
