# システム要件定義書（strategy）

**プロジェクト**: Real Estate Insight (REI)
**バージョン**: 1.0.0
**作成日**: 2026-04-27
**担当フェーズ**: 要件定義（具体） — business-strategist

---

## 1. 概要

本ドキュメントは、コンセプターフェーズで確定したビジネス要件を受け取り、designer / coder フェーズが参照可能な具体的なシステム要件に変換したものである。

### 1.1 ビジネス目的（再掲）

一都三県（東京・神奈川・埼玉・千葉）の市区町村単位で、**地価公示（XPT002）と不動産取引価格（XPT001）の両方**を時系列で可視化し、両指標の乖離幅を分析できるダッシュボードを提供する。

### 1.2 ステークホルダー

| 誰が | 何のために |
|-----|-----------|
| 不動産投資家・個人 | 市場価格と公示地価のギャップから割安・割高エリアを判断する |
| 不動産会社営業担当 | 顧客への市場説明資料として活用する |
| 自治体・研究者 | 地価トレンドの定量分析に使用する |
| システム管理者 | データ収集バッチを操作・監視する |

---

## 2. テーブルスキーマ定義

### 2.1 `raw_land_prices` テーブル（XPT002 地価公示）の更新

#### 2.1.1 XPT002 GeoJSON properties → DB カラム マッピング

> **注記**: XPT002 の正確なフィールド名は API を実際に叩いて確認が必要。以下は公開情報から推定した仮フィールド名。要確認箇所は「※要確認」で明示する。

| XPT002 GeoJSON プロパティ（推定） | DB カラム | 型 | 備考 |
|-----------------------------------|-----------|----|------|
| ※要確認: `MunicipalityCode` または `u_municipality_code` | `city_code` | `VARCHAR(5)` | JIS X 0402 5桁 |
| ※要確認: `Prefecture` | `prefecture_name` | `VARCHAR(10)` | |
| ※要確認: `Municipality` | `city_name` | `VARCHAR(50)` | |
| ※要確認: `DistrictName` または `u_district_name_ja` | `district_name` | `VARCHAR(100)` | |
| ※要確認: `u_current_years_price_ja` または `CurrentYearsPrice` | `price_per_sqm` | `BIGINT` | 円/㎡ |
| ※要確認: `LandUseType` または `u_land_use_type_code` | `land_use` | `VARCHAR(20)` | 用途種別コード |
| ※要確認: `Area` | `area_sqm` | `FLOAT` | ㎡ |
| ※要確認: `year` (APIパラメータ由来) | `year` | `INTEGER` | 公示年（西暦） |
| ※要確認: `Address` または `u_address_ja` | `address` | `VARCHAR(200)` | |
| ※要確認: `u_road_distance_to_nearest_station_name_ja` | `station_name` | `VARCHAR(50)` | 最寄り駅名 |
| ※要確認: `u_road_distance_to_nearest_station_m` | `distance_to_station` | `INTEGER` | m単位 |
| GeoJSON geometry.coordinates[1] | `latitude` | `FLOAT` | WGS84 |
| GeoJSON geometry.coordinates[0] | `longitude` | `FLOAT` | WGS84 |
| ※要確認: `PriceClassification` | `price_classification` | `VARCHAR(5)` | 新規追加カラム |
| ※要確認: `CityPlanning` | `city_planning` | `VARCHAR(50)` | 都市計画区域区分。新規追加 |
| ※要確認: `CoverageRatio` | `coverage_ratio` | `INTEGER` | 建蔽率(%)。新規追加 |
| ※要確認: `FloorAreaRatio` | `floor_area_ratio` | `INTEGER` | 容積率(%)。新規追加 |
| （システム付与） | `created_at` | `TIMESTAMP` | `server_default=NOW()` |
| （システム付与） | `updated_at` | `TIMESTAMP` | upsert時に更新 |

#### 2.1.2 更新後のユニーク制約

```
UNIQUE (city_code, year, address)
-- 既存の uq_land_price_entry を維持
-- postgresql_nulls_not_distinct=True を維持
```

#### 2.1.3 追加インデックス

```
INDEX (prefecture_code, year)
INDEX (year, land_use)
```

---

### 2.2 `raw_transaction_prices` テーブル（XPT001 取引価格）の新規定義

#### 2.2.1 XPT001 GeoJSON properties → DB カラム マッピング

> **注記**: XPT001 の GeoJSON properties はタイルAPI仕様のため、類似のテキストAPI（XIT001）の確定フィールド名を参考に推定。XPT001 実取得時に照合・修正が必要。

| XPT001 GeoJSON プロパティ（推定） | DB カラム | 型 | 備考 |
|-----------------------------------|-----------|----|------|
| ※要確認: `MunicipalityCode` | `city_code` | `VARCHAR(5)` | JIS X 0402 5桁 |
| ※要確認: `Prefecture` | `prefecture_name` | `VARCHAR(10)` | |
| ※要確認: `Municipality` | `city_name` | `VARCHAR(50)` | |
| ※要確認: `DistrictName` | `district_name` | `VARCHAR(100)` | |
| ※要確認: `Type` | `transaction_type` | `VARCHAR(20)` | 取引の種類（宅地(土地)等） |
| ※要確認: `Region` | `region` | `VARCHAR(20)` | 地域区分 |
| ※要確認: `TradePrice` | `trade_price` | `BIGINT` | 取引価格（総額、円） |
| ※要確認: `UnitPrice` | `price_per_sqm` | `BIGINT` | 円/㎡。NULLあり |
| ※要確認: `PricePerUnit` | `price_per_tsubo` | `BIGINT` | 円/坪。NULLあり |
| ※要確認: `Area` | `area_sqm` | `FLOAT` | 面積（㎡） |
| ※要確認: `LandShape` | `land_shape` | `VARCHAR(20)` | 土地の形状 |
| ※要確認: `Frontage` | `frontage` | `FLOAT` | 間口（m） |
| ※要確認: `TotalFloorArea` | `total_floor_area` | `FLOAT` | 延床面積（㎡）。建物付き案件 |
| ※要確認: `BuildingYear` | `building_year` | `INTEGER` | 建築年。建物付き案件 |
| ※要確認: `Structure` | `structure` | `VARCHAR(20)` | 建物構造 |
| ※要確認: `Use` | `current_use` | `VARCHAR(50)` | 現況の用途 |
| ※要確認: `Purpose` | `future_use` | `VARCHAR(50)` | 利用目的（将来） |
| ※要確認: `CityPlanning` | `city_planning` | `VARCHAR(50)` | 都市計画区域区分 |
| ※要確認: `CoverageRatio` | `coverage_ratio` | `INTEGER` | 建蔽率(%) |
| ※要確認: `FloorAreaRatio` | `floor_area_ratio` | `INTEGER` | 容積率(%) |
| ※要確認: `Direction` | `road_direction` | `VARCHAR(10)` | 接道方位 |
| ※要確認: `Classification` | `road_classification` | `VARCHAR(20)` | 接道種類 |
| ※要確認: `Breadth` | `road_breadth` | `FLOAT` | 接道幅員（m） |
| ※要確認: `Period` | `trade_period` | `VARCHAR(10)` | 取引時点（例: "2024年第1四半期"） |
| ※要確認: `FloorPlan` | `floor_plan` | `VARCHAR(20)` | 間取り |
| ※要確認: `Renovation` | `renovation` | `VARCHAR(10)` | 改装の有無 |
| ※要確認: `Remarks` | `remarks` | `TEXT` | 取引の事情等 |
| GeoJSON geometry.coordinates[1] | `latitude` | `FLOAT` | WGS84。最寄駅の座標の場合あり |
| GeoJSON geometry.coordinates[0] | `longitude` | `FLOAT` | WGS84 |
| （システム付与・APIパラメータ由来） | `year` | `INTEGER` | 取引年（西暦。Period から抽出） |
| （システム付与・APIパラメータ由来） | `quarter` | `INTEGER` | 取引四半期（1〜4。Period から抽出） |
| （システム付与） | `created_at` | `TIMESTAMP` | `server_default=NOW()` |
| （システム付与） | `updated_at` | `TIMESTAMP` | upsert時に更新 |

#### 2.2.2 ユニーク制約

```sql
UNIQUE (city_code, trade_period, district_name, trade_price, area_sqm, transaction_type)
-- 同一期間・同一地区・同額・同面積・同種別の組み合わせを重複排除
-- 名称: uq_transaction_price_entry
-- postgresql_nulls_not_distinct=True を適用
```

> **根拠**: XPT001 は取引地点ではなく最寄り駅座標を返すため、緯度経度による一意性担保が困難。取引の特定には上記複合キーが現実的。

#### 2.2.3 インデックス

```
PRIMARY KEY (id)
INDEX (city_code, year, quarter)
INDEX (city_code, transaction_type)
INDEX (year, quarter)
```

---

### 2.3 乖離幅 VIEW `v_price_divergence`

**誰が**: 分析ユーザー（投資家・研究者）が
**何を**: 地価公示価格と実際の取引価格の差（乖離率）を
**どのように**: 市区町村 × 年次で集計した VIEW をクエリして
**なぜ**: 割安・割高エリアを定量的に比較するため

#### 2.3.1 VIEW 定義（SQL）

```sql
CREATE OR REPLACE VIEW v_price_divergence AS
SELECT
    lp.city_code,
    lp.city_name,
    lp.prefecture_name,
    lp.year,
    ROUND(AVG(lp.price_per_sqm))              AS avg_published_price,   -- 地価公示 平均（円/㎡）
    ROUND(AVG(tp.price_per_sqm))              AS avg_transaction_price, -- 取引価格 平均（円/㎡）
    ROUND(
        (AVG(tp.price_per_sqm) - AVG(lp.price_per_sqm))
        / NULLIF(AVG(lp.price_per_sqm), 0)
        * 100,
    2)                                         AS divergence_rate,       -- 乖離率（%）
    COUNT(DISTINCT lp.id)                      AS published_count,       -- 公示地点数
    COUNT(DISTINCT tp.id)                      AS transaction_count      -- 取引件数
FROM
    raw_land_prices lp
    INNER JOIN raw_transaction_prices tp
        ON lp.city_code = tp.city_code
        AND lp.year     = tp.year
        AND tp.transaction_type IN ('宅地(土地)', '宅地(土地と建物)')  -- ※要確認: type値
WHERE
    lp.price_per_sqm IS NOT NULL
    AND tp.price_per_sqm IS NOT NULL
GROUP BY
    lp.city_code,
    lp.city_name,
    lp.prefecture_name,
    lp.year;
```

#### 2.3.2 出力カラム定義

| カラム名 | 型 | 説明 |
|---------|-----|------|
| `city_code` | `VARCHAR(5)` | 市区町村コード（JIS X 0402） |
| `city_name` | `VARCHAR(50)` | 市区町村名 |
| `prefecture_name` | `VARCHAR(10)` | 都道府県名 |
| `year` | `INTEGER` | 対象年（西暦） |
| `avg_published_price` | `BIGINT` | 地価公示 市区町村内平均（円/㎡） |
| `avg_transaction_price` | `BIGINT` | 取引価格 市区町村内平均（円/㎡） |
| `divergence_rate` | `NUMERIC(6,2)` | 乖離率 = (取引価格 - 公示地価) / 公示地価 × 100 (%) |
| `published_count` | `INTEGER` | 集計に使用した公示地点数 |
| `transaction_count` | `INTEGER` | 集計に使用した取引件数 |

---

## 3. バッチ設計

### 3.1 実行スクリプト インターフェース

#### 3.1.1 地価公示バッチ（XPT002）

**ファイル**: `backend/app/batch/fetch_land_prices.py`
**誰が**: システム管理者または定期スケジューラが
**何を**: reinfolib XPT002 API から地価公示データを取得してDBに保存する

```
python -m app.batch.fetch_land_prices \
    --year-from YYYY \       # 取得開始年（西暦）。必須
    --year-to   YYYY \       # 取得終了年（西暦）。必須
    --pref-codes 13,14,11,12  # 対象都道府県コード（カンマ区切り）。デフォルト=一都三県
    [--dry-run]              # DBへの書き込みを行わずログのみ出力
    [--log-level DEBUG|INFO|WARNING]  # デフォルト=INFO
```

#### 3.1.2 取引価格バッチ（XPT001）

**ファイル**: `backend/app/batch/fetch_transaction_prices.py`
**誰が**: システム管理者または定期スケジューラが
**何を**: reinfolib XPT001 API から取引価格データを取得してDBに保存する

```
python -m app.batch.fetch_transaction_prices \
    --year-from YYYY \       # 取得開始年（西暦）。必須
    --year-to   YYYY \       # 取得終了年（西暦）。必須
    --quarter-from Q \       # 取得開始四半期（1〜4）。デフォルト=1
    --quarter-to   Q \       # 取得終了四半期（1〜4）。デフォルト=4
    --pref-codes 13,14,11,12  # 対象都道府県コード。デフォルト=一都三県
    [--dry-run]
    [--log-level DEBUG|INFO|WARNING]
```

---

### 3.2 タイル座標計算ロジック

**目的**: 対象市区町村の bounding box（緯度経度範囲）からズームレベル z=12 のタイル列挙を行い、API の z/x/y パラメータを生成する。

#### 3.2.1 ズームレベルの決定方針

| ズームレベル | タイルサイズ（概算） | 適用範囲 |
|------------|-------------------|---------|
| z=11 | 約30〜40km四方 | 広域取得（都道府県単位） |
| z=12 | 約15〜20km四方 | 市区町村単位（採用） |
| z=13 | 約8〜10km四方 | 過剰に細かい |

REIの対象市区町村（一都三県の市区町村）はいずれも z=12 のタイル複数枚に収まる程度のサイズのため、z=12 を標準とする。

#### 3.2.2 タイル計算アルゴリズム

```
入力: 市区町村の bbox (min_lat, min_lon, max_lat, max_lon)、ズームレベル z

1. 緯度経度 → タイル座標変換（Slippy Map Tilenames 規約）
   x = floor((lon + 180) / 360 * 2^z)
   y = floor((1 - ln(tan(lat * π/180) + 1/cos(lat * π/180)) / π) / 2 * 2^z)

2. bbox の 4隅（min, max の組み合わせ）から (x_min, y_min) 〜 (x_max, y_max) を算出

3. タイル一覧 = { (z, x, y) | x in [x_min, x_max], y in [y_min, y_max] }
```

> 市区町村の bbox は GeoJSON ファイル（`public/geo/municipalities.geojson`）から事前計算してキャッシュする。

---

### 3.3 取得 → パース → upsert フロー

```
[バッチ起動]
    │
    ├─ 1. 設定ロード
    │      config.py から RE_INFO_LIB_KEY, DATABASE_URL を取得
    │
    ├─ 2. 対象市区町村リスト取得
    │      GeoJSON から city_code と bbox を読み込む
    │
    ├─ 3. タイル座標列挙
    │      bbox → Slippy Map Tile 変換 → タイルリスト生成
    │
    ├─ 4. APIリクエスト（タイルごとにループ）
    │      GET https://www.reinfolib.mlit.go.jp/ex-api/external/XPT001
    │      ヘッダー: Ocp-Apim-Subscription-Key: {RE_INFO_LIB_KEY}
    │      パラメータ: response_format=geojson, z={z}, x={x}, y={y}, from={YYYYQ}, to={YYYYQ}
    │
    ├─ 5. GeoJSON パース
    │      features[] をイテレート
    │      各 feature の properties と geometry.coordinates をモデルにマッピング
    │      city_code でフィルタリング（対象一都三県外を除外）
    │      year / quarter を trade_period 文字列から抽出
    │
    ├─ 6. upsert（PostgreSQL ON CONFLICT）
    │      INSERT INTO raw_transaction_prices ...
    │      ON CONFLICT (uq_transaction_price_entry) DO UPDATE SET updated_at = NOW()
    │
    └─ 7. 完了ログ出力
           取得件数 / upsert件数 / スキップ件数 / エラー件数を記録
```

---

### 3.4 エラーハンドリング方針

| エラー種別 | 対応 |
|-----------|------|
| HTTP 429 (Rate Limit) | 指数バックオフ（最大3回リトライ）後スキップ、ログに記録 |
| HTTP 401 / 403 | 即時中断。APIキー設定の確認を促すメッセージを出力 |
| HTTP 5xx | 3回リトライ後、タイルをスキップして続行 |
| ネットワークタイムアウト | タイムアウト30秒。3回リトライ後スキップ |
| JSON パースエラー | 当該タイルをスキップ、エラーログに生レスポンスの先頭200文字を記録 |
| DB upsert 失敗 | ロールバック後スキップ、エラーログに詳細を記録 |
| city_code フィルタ除外 | 件数カウントのみ（ログレベル DEBUG） |

- バッチ全体がエラーで中断する場合は、exit code 1 を返す
- 部分的なエラー（タイル単位のスキップ）の場合は、バッチ完了後に警告サマリーを出力し exit code 0 を返す

---

## 4. FastAPI エンドポイント仕様

### 4.1 既存エンドポイント（変更なし）

| メソッド | パス | 概要 |
|---------|------|------|
| `GET` | `/api/v1/land-prices/` | 地価公示レコード一覧取得 |
| `POST` | `/api/v1/land-prices/` | 地価公示レコード1件登録 |
| `GET` | `/api/v1/land-prices/summary/cities` | 地価公示 市区町村×年次サマリー |

---

### 4.2 新規エンドポイント

#### 4.2.1 `POST /api/v1/ingest/land-prices` — 地価公示バッチ起動

**誰が**: システム管理者が
**何を**: XPT002 バッチを非同期で起動する
**なぜ**: 管理画面や CI/CD から手動でデータ更新できるようにするため

**リクエスト**:

```http
POST /api/v1/ingest/land-prices
Content-Type: application/json

{
  "year_from": 2020,
  "year_to": 2024,
  "pref_codes": ["13", "14", "11", "12"],
  "dry_run": false
}
```

| フィールド | 型 | 必須 | バリデーション | 説明 |
|-----------|-----|------|--------------|------|
| `year_from` | `int` | 必須 | 2000 ≤ year ≤ 現在年+1 | 取得開始年 |
| `year_to` | `int` | 必須 | year_from ≤ year_to | 取得終了年 |
| `pref_codes` | `list[str]` | 任意 | 長さ1〜4、要素は"11"/"12"/"13"/"14" | 対象都道府県コード |
| `dry_run` | `bool` | 任意 | デフォルト=false | trueの場合DB書き込みなし |

**レスポンス (202 Accepted)**:

```json
{
  "job_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "status": "queued",
  "message": "バッチジョブをキューに登録しました。"
}
```

**エラーレスポンス**:

| HTTPステータス | 条件 |
|--------------|------|
| 400 | バリデーション違反 |
| 503 | RE_INFO_LIB_KEY が未設定 |

---

#### 4.2.2 `POST /api/v1/ingest/transactions` — 取引価格バッチ起動

**誰が**: システム管理者が
**何を**: XPT001 バッチを非同期で起動する

**リクエスト**:

```http
POST /api/v1/ingest/transactions
Content-Type: application/json

{
  "year_from": 2020,
  "year_to": 2024,
  "quarter_from": 1,
  "quarter_to": 4,
  "pref_codes": ["13", "14", "11", "12"],
  "dry_run": false
}
```

| フィールド | 型 | 必須 | バリデーション | 説明 |
|-----------|-----|------|--------------|------|
| `year_from` | `int` | 必須 | 2000 ≤ year ≤ 現在年+1 | 取得開始年 |
| `year_to` | `int` | 必須 | year_from ≤ year_to | 取得終了年 |
| `quarter_from` | `int` | 任意 | 1〜4。デフォルト=1 | 開始四半期 |
| `quarter_to` | `int` | 任意 | quarter_from ≤ quarter_to ≤ 4。デフォルト=4 | 終了四半期 |
| `pref_codes` | `list[str]` | 任意 | 同上 | 対象都道府県コード |
| `dry_run` | `bool` | 任意 | デフォルト=false | |

**レスポンス (202 Accepted)**:

```json
{
  "job_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "status": "queued",
  "message": "バッチジョブをキューに登録しました。"
}
```

---

#### 4.2.3 `GET /api/v1/transactions/summary/cities` — 取引価格 市区町村サマリー

**誰が**: フロントエンド（ダッシュボード）が
**何を**: 市区町村×年次×四半期の取引価格集計を取得する
**なぜ**: 地価公示と同様のチャート・マップ表示に使用するため

**クエリパラメータ**:

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `prefecture_code` | `str` | 任意 | なし | 都道府県コード（2桁）でフィルタ |
| `city_code` | `str` | 任意 | なし | 市区町村コード（5桁）でフィルタ |
| `year_from` | `int` | 任意 | なし | 年範囲（以上） |
| `year_to` | `int` | 任意 | なし | 年範囲（以下） |
| `transaction_type` | `str` | 任意 | なし | 取引種別（例: "宅地(土地)"）。※要確認 |
| `aggregate_by` | `str` | 任意 | `"annual"` | `"annual"` または `"quarterly"` |

**レスポンス (200 OK)**:

```json
[
  {
    "city_code": "13101",
    "city_name": "千代田区",
    "prefecture_name": "東京都",
    "year": 2023,
    "quarter": null,
    "avg_price_per_sqm": 1500000,
    "min_price_per_sqm": 800000,
    "max_price_per_sqm": 3000000,
    "avg_trade_price": 120000000,
    "record_count": 42
  }
]
```

**レスポンス型 `TransactionCityAnnualSummary`**:

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `city_code` | `str` | 市区町村コード |
| `city_name` | `str` | 市区町村名 |
| `prefecture_name` | `str` | 都道府県名 |
| `year` | `int` | 年 |
| `quarter` | `int \| None` | 四半期（annual集計時はnull） |
| `avg_price_per_sqm` | `float` | 平均単価（円/㎡） |
| `min_price_per_sqm` | `int` | 最小単価（円/㎡） |
| `max_price_per_sqm` | `int` | 最大単価（円/㎡） |
| `avg_trade_price` | `float` | 平均取引総額（円） |
| `record_count` | `int` | 集計件数 |

---

#### 4.2.4 `GET /api/v1/divergence/cities` — 乖離幅サマリー

**誰が**: フロントエンド（乖離幅画面）が
**何を**: 市区町村×年次の地価公示と取引価格の乖離率を取得する
**なぜ**: 割安・割高エリアの色付けマップと時系列チャートを描画するため

**クエリパラメータ**:

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `prefecture_code` | `str` | 任意 | なし | 都道府県コードでフィルタ |
| `city_code` | `str` | 任意 | なし | 市区町村コードでフィルタ |
| `year_from` | `int` | 任意 | なし | 年範囲（以上） |
| `year_to` | `int` | 任意 | なし | 年範囲（以下） |

**レスポンス (200 OK)**:

```json
[
  {
    "city_code": "13101",
    "city_name": "千代田区",
    "prefecture_name": "東京都",
    "year": 2023,
    "avg_published_price": 1200000,
    "avg_transaction_price": 1500000,
    "divergence_rate": 25.00,
    "published_count": 15,
    "transaction_count": 42
  }
]
```

**レスポンス型 `CityPriceDivergence`**:

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `city_code` | `str` | 市区町村コード |
| `city_name` | `str` | 市区町村名 |
| `prefecture_name` | `str` | 都道府県名 |
| `year` | `int` | 年 |
| `avg_published_price` | `int` | 地価公示 平均（円/㎡） |
| `avg_transaction_price` | `int` | 取引価格 平均（円/㎡） |
| `divergence_rate` | `float` | 乖離率（%）。正=取引価格 > 公示 |
| `published_count` | `int` | 公示地点数 |
| `transaction_count` | `int` | 取引件数 |

**エラーレスポンス**:

| HTTPステータス | 条件 |
|--------------|------|
| 404 | データが0件の場合（空配列でも可。実装判断） |
| 400 | パラメータ不正 |

---

#### 4.2.5 `GET /api/v1/ingest/jobs/{job_id}` — バッチジョブ状態確認

**誰が**: 管理画面・フロントエンドが
**何を**: バッチジョブの進行状況を確認する
**なぜ**: 非同期実行のため完了・エラーをポーリングで確認できるようにするため

**レスポンス (200 OK)**:

```json
{
  "job_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "job_type": "land_prices",
  "status": "running",
  "progress": {
    "total_tiles": 200,
    "processed_tiles": 80,
    "upserted": 1500,
    "skipped": 10,
    "errors": 2
  },
  "started_at": "2026-04-27T10:00:00Z",
  "finished_at": null,
  "error_message": null
}
```

| フィールド `status` | 意味 |
|--------------------|------|
| `queued` | キュー待ち |
| `running` | 実行中 |
| `completed` | 正常完了 |
| `failed` | 失敗（`error_message` に詳細） |
| `partial` | 部分完了（一部タイルでエラー） |

---

### 4.3 ルーター追加設計（`main.py` への追記）

```python
# 追加するルーター
app.include_router(transactions.router,  prefix="/api/v1/transactions",  tags=["transactions"])
app.include_router(ingest.router,        prefix="/api/v1/ingest",        tags=["ingest"])
app.include_router(divergence.router,    prefix="/api/v1/divergence",    tags=["divergence"])
```

---

## 5. 設定・環境変数の追加

### 5.1 `backend/app/config.py` への追加定義

```python
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # 既存
    database_url: str = "postgresql://rei_user:rei_password@localhost:5432/rei_db"
    cors_origins: list[str] = ["http://localhost:3000"]

    # 新規追加
    re_info_lib_key: str = ""                            # reinfolib API キー（必須）
    batch_zoom_level: int = 12                           # タイル取得ズームレベル
    batch_request_timeout_sec: int = 30                  # APIリクエストタイムアウト（秒）
    batch_max_retries: int = 3                           # 最大リトライ回数
    batch_retry_backoff_base_sec: float = 2.0            # リトライバックオフ基数（秒）
    batch_concurrent_requests: int = 3                   # 並列リクエスト数（レートリミット対策）
    default_pref_codes: list[str] = ["13", "14", "11", "12"]  # デフォルト対象都道府県

    class Config:
        env_file = ".env"


settings = Settings()
```

### 5.2 `backend/.env` に追加すべき変数一覧

```dotenv
# =============================
# reinfolib API
# =============================
RE_INFO_LIB_KEY=your_api_key_here            # 不動産情報ライブラリ サブスクリプションキー

# =============================
# バッチ設定（省略時はデフォルト値を使用）
# =============================
BATCH_ZOOM_LEVEL=12
BATCH_REQUEST_TIMEOUT_SEC=30
BATCH_MAX_RETRIES=3
BATCH_RETRY_BACKOFF_BASE_SEC=2.0
BATCH_CONCURRENT_REQUESTS=3
DEFAULT_PREF_CODES=["13","14","11","12"]

# =============================
# 既存（変更なし）
# =============================
DATABASE_URL=postgresql://rei_user:rei_password@db:5432/rei_db
CORS_ORIGINS=["http://localhost:3000"]
```

> **セキュリティ注記**: `RE_INFO_LIB_KEY` を含む `.env` ファイルは `.gitignore` に追加し、リポジトリにコミットしないこと。

---

## 6. 非機能要件

### 6.1 パフォーマンス要件

| 要件 | 目標値 | 根拠 |
|------|-------|------|
| API レスポンスタイム（サマリー系） | 95パーセンタイルで 1秒以内 | フロントエンドの体感速度 |
| API レスポンスタイム（乖離幅） | 95パーセンタイルで 2秒以内 | JOIN クエリのため |
| バッチ処理速度（直近5年・一都三県） | 30分以内 | 初期取得・手動実行を想定 |
| バッチ処理速度（四半期増分） | 10分以内 | 定期更新を想定 |

### 6.2 データ整合性要件

- `raw_land_prices` と `raw_transaction_prices` の upsert は同一トランザクション内で完結させる
- `v_price_divergence` のクエリはリアルタイム集計（マテリアライズド化はフェーズ2）

### 6.3 可観測性要件

- バッチ実行ログは構造化ログ（JSON形式）で標準出力に出力
- 取得件数・upsert件数・エラー件数を必ずログに含める

---

## 7. 未解決事項・要確認リスト

| No | 項目 | 確認方法 |
|----|------|---------|
| 1 | XPT002 GeoJSON properties の正確なフィールド名 | APIキー取得後に実際にレスポンスを確認 |
| 2 | XPT001 GeoJSON properties の正確なフィールド名（タイルAPIはXIT001と異なる場合あり） | APIキー取得後に実際にレスポンスを確認 |
| 3 | XPT001 の geometry が取引地点か最寄り駅か、物件によって異なるか | API ドキュメント精読 + 実取得で確認 |
| 4 | `transaction_type` の値一覧（"宅地(土地)" 等の正確な文字列） | XIT001 公式ドキュメントの「区分値定義」参照 |
| 5 | XPT002 の `priceClassification` の値体系 | API ドキュメント参照 |
| 6 | バッチ非同期化の実装方式（BackgroundTasks / Celery / APScheduler） | architectフェーズで決定 |
| 7 | `cors_origins` の既存値が `http://localhost:5173` のままになっている | `http://localhost:3000` に修正が必要（Next.js移行済み） |

---

*以上が business-strategist フェーズの成果物。次フェーズ（architect / security-reviewer）への引き継ぎ情報として使用すること。*
