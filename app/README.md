# Real Estate Insight (REI)

一都三県（東京・神奈川・埼玉・千葉）の地価推移・地価乖離率を市区町村・町レベルで可視化するダッシュボード＆マップアプリケーション。

## 主な機能

- **都道府県別ページ** (`/prefecture/[code]`): 用途区分フィルター付き変化率カードグリッド・コロプレスマップ・折れ線グラフ
- **市区町村詳細ページ** (`/city/[city_code]`): 町別の地価変化率マップ（ポリゴン着色）・変化率カード・推移グラフ
- **地価乖離率ページ** (`/divergence`): 公示地価 vs 実取引価格の乖離率を市区町村・町レベルで可視化

## 技術スタック

| レイヤー | 技術 | 備考 |
|---------|------|------|
| Frontend | Next.js 15 (App Router) + TypeScript | Turbopack 使用 |
| Runtime | Bun | パッケージ管理・スクリプト実行 |
| Map | react-map-gl (MapLibre GL) | Carto Dark Matter タイル |
| Chart | recharts | 折れ線グラフ |
| Backend | Python FastAPI + SQLAlchemy | ポート 8000 |
| Database | PostgreSQL 16 (Docker) | |

## セットアップ

```bash
docker compose up
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

> `node_modules` は起動時に自動インストールされるため、ホスト側での事前 `bun install` は不要。

## データソース

| データ | ソース | 収録範囲 |
|-------|--------|---------|
| 公示地価 | 不動産情報ライブラリ API（reinfolib.mlit.go.jp） | 一都三県 2015-2024 |
| 不動産取引価格 | 不動産情報ライブラリ API | 一都三県 2015-2024（約 80 万件） |
| 市区町村境界 | 国土数値情報 N03 行政区域データ（2023年版） | 一都三県 143 市区町村 |
| 町丁目境界 | e-Stat 国勢調査 小地域境界データ（令和2年版） | 東京都 1,862 町（神奈川・埼玉・千葉は未整備） |

## ディレクトリ構成

```
.
├── frontend/         # Next.js アプリケーション
├── backend/          # FastAPI アプリケーション
├── docs/             # 設計書・要件定義
└── compose.yml       # Docker Compose 定義
```
