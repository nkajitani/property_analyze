# バックエンド テスト仕様書

**プロジェクト**: Real Estate Insight (REI)
**バージョン**: 1.0.0
**作成日**: 2026-04-27
**担当フェーズ**: テスト設計 — test-planner
**参照設計書**: `docs/designs/backend.md`, `docs/requirements/strategy.md`, `docs/security/requirements.md`

---

## 1. テスト方針

### 1.1 対象スコープ

| 対象 | テスト種別 |
|------|----------|
| FastAPI ルーター（全エンドポイント） | 統合テスト（TestClient） |
| pydantic スキーマバリデーション | 単体テスト |
| `services/tile_calculator.py` | 単体テスト |
| `dependencies.verify_admin_token` | 単体テスト |
| `services/job_manager.py` | 単体テスト（DB モック） |
| `batch/base.py` パース処理 | 単体テスト |
| `services/reinfolib.py` | 単体テスト（httpx モック） |

### 1.2 テストフレームワーク・ツール

- **pytest** + **pytest-asyncio**
- **fastapi.testclient.TestClient**
- **respx** または **httpx.MockTransport**（reinfolib クライアントのモック）
- **pytest-cov**（カバレッジ計測、目標: 80% 以上）

### 1.3 テストデータ方針

- DB が必要なテストは `pytest` fixture で SQLite インメモリ DB を使用する
- reinfolib API 呼び出しは必ず httpx モックに置き換え、実 API は叩かない

---

## 2. ルーターテスト — `GET /health`

| テスト ID | テストケース | 入力 | 期待結果 |
|----------|------------|------|---------|
| BE-HEALTH-01 | 正常レスポンス | `GET /health` | HTTP 200、`{"status": "ok"}` |

---

## 3. ルーターテスト — `GET /api/v1/land-prices/`

| テスト ID | テストケース | 入力 | 期待結果 |
|----------|------------|------|---------|
| BE-LP-LIST-01 | データなし時の一覧取得 | クエリなし | HTTP 200、空配列 `[]` |
| BE-LP-LIST-02 | 全件取得（limit デフォルト） | クエリなし、DB に 3 件 | HTTP 200、3 件の配列 |
| BE-LP-LIST-03 | `prefecture_code` フィルタ | `?prefecture_code=13` | 都道府県コード 13 のみ返す |
| BE-LP-LIST-04 | `city_code` フィルタ | `?city_code=13101` | 該当市区町村のみ返す |
| BE-LP-LIST-05 | `year` フィルタ | `?year=2023` | 該当年のみ返す |
| BE-LP-LIST-06 | `limit` パラメータ | `?limit=2`、DB に 5 件 | 2 件のみ返す |
| BE-LP-LIST-07 | `offset` パラメータ | `?offset=2`、DB に 5 件 | 3 件目以降を返す |
| BE-LP-LIST-08 | `limit` 上限超過 | `?limit=1001` | HTTP 422 |

---

## 4. ルーターテスト — `POST /api/v1/land-prices/`

| テスト ID | テストケース | 入力 | 期待結果 |
|----------|------------|------|---------|
| BE-LP-POST-01 | 正常登録 | 必須フィールドを含む有効なペイロード | HTTP 201、登録されたレコードを返す |
| BE-LP-POST-02 | 重複登録（uq_land_price_entry） | 同一 `city_code`, `year`, `address` | HTTP 409 |
| BE-LP-POST-03 | 必須フィールド欠落 | `price_per_sqm` を省いたペイロード | HTTP 422 |
| BE-LP-POST-04 | 型不正 | `price_per_sqm: "abc"` | HTTP 422 |

---

## 5. ルーターテスト — `GET /api/v1/land-prices/summary/cities`

| テスト ID | テストケース | 入力 | 期待結果 |
|----------|------------|------|---------|
| BE-LP-SUM-01 | データなし | クエリなし | HTTP 200、空配列 |
| BE-LP-SUM-02 | 集計正確性 | 同一市区町村・同一年の 3 件（price: 100, 200, 300） | `avg=200.0`, `min=100`, `max=300`, `record_count=3` |
| BE-LP-SUM-03 | `prefecture_code` フィルタ | `?prefecture_code=13` | 東京都のみ集計 |
| BE-LP-SUM-04 | 複数市区町村 × 複数年度 | 2 市区 × 3 年分 | 6 行返す、city_code + year 昇順 |

---

## 6. ルーターテスト — `GET /api/v1/transactions/summary/cities`

| テスト ID | テストケース | 入力 | 期待結果 |
|----------|------------|------|---------|
| BE-TX-SUM-01 | データなし | クエリなし | HTTP 200、空配列 |
| BE-TX-SUM-02 | `annual` 集計 | `?aggregate_by=annual`、同一市区×年に Q1〜Q4 のデータあり | `quarter=null`、全四半期を集計 |
| BE-TX-SUM-03 | `quarterly` 集計 | `?aggregate_by=quarterly` | `quarter` が各行に設定される |
| BE-TX-SUM-04 | `city_code` 正規表現検証（正常） | `?city_code=13101` | HTTP 200 |
| BE-TX-SUM-05 | `city_code` 4 桁 | `?city_code=1310` | HTTP 422（SEC-VAL-05） |
| BE-TX-SUM-06 | `city_code` 英字混入 | `?city_code=1310A` | HTTP 422（SEC-VAL-05） |
| BE-TX-SUM-07 | `prefecture_code` フィルタ | `?prefecture_code=14` | 神奈川県のみ返す |
| BE-TX-SUM-08 | `year_from` / `year_to` フィルタ | `?year_from=2022&year_to=2023` | 2022〜2023 のみ返す |
| BE-TX-SUM-09 | 集計値の正確性 | price_per_sqm: 100000, 200000 の 2 件 | `avg=150000.0`, `min=100000`, `max=200000` |

---

## 7. ルーターテスト — `GET /api/v1/divergence/cities`

| テスト ID | テストケース | 入力 | 期待結果 |
|----------|------------|------|---------|
| BE-DIV-01 | データなし（VIEW に一致行なし） | クエリなし | HTTP 200、空配列 |
| BE-DIV-02 | 正常取得（VIEW にデータあり） | クエリなし | HTTP 200、`CityPriceDivergence` 配列 |
| BE-DIV-03 | `divergence_rate` の計算正確性 | 公示平均=100万、取引平均=125万 | `divergence_rate=25.00` |
| BE-DIV-04 | `prefecture_code` フィルタ | `?prefecture_code=13` | `city_code` 先頭 2 桁が "13" のみ |
| BE-DIV-05 | `city_code` フィルタ | `?city_code=13101` | 該当市区町村のみ |
| BE-DIV-06 | `year_from` / `year_to` フィルタ | `?year_from=2022&year_to=2023` | 範囲内年度のみ |
| BE-DIV-07 | SQLi 対策確認 | `city_code` に `'; DROP TABLE--` 相当 | HTTP 422 かつ SQL エラーなし（SEC-VAL-05 + SEC-VAL-07） |

---

## 8. ルーターテスト — `POST /api/v1/ingest/land-prices`

| テスト ID | テストケース | 入力 | 期待結果 |
|----------|------------|------|---------|
| BE-ING-LP-01 | 正常起動（dry_run=true） | 有効トークン + 有効ペイロード | HTTP 202、`job_id` が UUID 形式 |
| BE-ING-LP-02 | 認証ヘッダーなし | X-Admin-Token 省略 | HTTP 403（SEC-AUTH-01） |
| BE-ING-LP-03 | 認証トークン不一致 | `X-Admin-Token: wrongtoken` | HTTP 403 |
| BE-ING-LP-04 | `year_from` 下限違反 | `year_from: 1999` | HTTP 422（SEC-VAL-01） |
| BE-ING-LP-05 | `year_from` 上限違反 | `year_from: 2100` | HTTP 422（SEC-VAL-01） |
| BE-ING-LP-06 | `year_from > year_to` | `year_from: 2024, year_to: 2022` | HTTP 422（SEC-VAL-02） |
| BE-ING-LP-07 | `pref_codes` に allowlist 外 | `pref_codes: ["99"]` | HTTP 422（SEC-VAL-03） |
| BE-ING-LP-08 | `pref_codes` に一都三県外 | `pref_codes: ["01"]` | HTTP 422（SEC-VAL-03） |
| BE-ING-LP-09 | RE_INFO_LIB_KEY 未設定 | 有効トークン + 有効ペイロード | HTTP 503 |
| BE-ING-LP-10 | `pref_codes` 省略（デフォルト） | `pref_codes` フィールドなし | HTTP 202、デフォルト値で起動 |

---

## 9. ルーターテスト — `POST /api/v1/ingest/transactions`

| テスト ID | テストケース | 入力 | 期待結果 |
|----------|------------|------|---------|
| BE-ING-TX-01 | 正常起動 | 有効トークン + 有効ペイロード | HTTP 202 |
| BE-ING-TX-02 | 認証ヘッダーなし | X-Admin-Token 省略 | HTTP 403 |
| BE-ING-TX-03 | `quarter_from` 下限違反 | `quarter_from: 0` | HTTP 422（SEC-VAL-04） |
| BE-ING-TX-04 | `quarter_to` 上限違反 | `quarter_to: 5` | HTTP 422（SEC-VAL-04） |
| BE-ING-TX-05 | `quarter_from > quarter_to` | `quarter_from: 3, quarter_to: 1` | HTTP 422 |
| BE-ING-TX-06 | `year_from > year_to` | `year_from: 2024, year_to: 2022` | HTTP 422（SEC-VAL-02） |

---

## 10. ルーターテスト — `GET /api/v1/ingest/jobs/{job_id}`

| テスト ID | テストケース | 入力 | 期待結果 |
|----------|------------|------|---------|
| BE-JOB-01 | 存在するジョブ ID | 有効トークン + 存在する `job_id` | HTTP 200、`JobStatusResponse` |
| BE-JOB-02 | 存在しないジョブ ID | 有効トークン + 存在しない UUID | HTTP 404 |
| BE-JOB-03 | 認証ヘッダーなし | X-Admin-Token 省略 | HTTP 403 |
| BE-JOB-04 | `status=completed` のジョブ | completed 状態の job_id | `finished_at` が null でない |
| BE-JOB-05 | `status=running` のジョブ | running 状態の job_id | `progress` に `total_tiles`, `processed_tiles` が含まれる |

---

## 11. 単体テスト — `dependencies.verify_admin_token`

| テスト ID | テストケース | 入力 | 期待結果 |
|----------|------------|------|---------|
| BE-DEP-01 | 正しいトークン | `settings.admin_token` と一致 | 例外なし |
| BE-DEP-02 | 間違ったトークン | `"wrong"` | `HTTPException(status_code=403)` |
| BE-DEP-03 | 空文字トークン | `""` | `HTTPException(status_code=403)` |

---

## 12. 単体テスト — `services/tile_calculator.py`

| テスト ID | テストケース | 入力 | 期待結果 |
|----------|------------|------|---------|
| BE-TILE-01 | 東京駅付近のタイル変換 | `lat=35.6812, lon=139.7671, zoom=12` | 計算上の正しい (x, y) |
| BE-TILE-02 | bbox 単一タイル収束 | 同一タイルに収まる bbox | 1 件の `(z, x, y)` を返す |
| BE-TILE-03 | bbox 複数タイル列挙 | 2×2 タイルをまたぐ bbox | 4 件の `(z, x, y)` を返す |
| BE-TILE-04 | zoom=12 が設定値として使用される | デフォルト設定 | 生成タイルの z が全て 12 |
| BE-TILE-05 | 北緯・東経の y 方向 | `min_lat < max_lat` | `y_min < y_max`（北=小さい y） |

---

## 13. 単体テスト — `schemas/ingest.py` バリデーション

| テスト ID | テストケース | 入力 | 期待結果 |
|----------|------------|------|---------|
| BE-SCH-01 | 正常系 | `year_from=2020, year_to=2024` | バリデーション通過 |
| BE-SCH-02 | `year_from` = 2000（境界値下限） | `year_from=2000` | 通過 |
| BE-SCH-03 | `year_from` = 1999（下限-1） | `year_from=1999` | `ValueError` |
| BE-SCH-04 | `year_to` = 現在年+1（上限） | `year_to=現在年+1` | 通過 |
| BE-SCH-05 | `year_to` = 現在年+2（上限+1） | `year_to=現在年+2` | `ValueError` |
| BE-SCH-06 | `year_from > year_to` | `year_from=2024, year_to=2020` | `ValueError` |
| BE-SCH-07 | `year_from == year_to` | `year_from=2023, year_to=2023` | 通過（同年は許可） |
| BE-SCH-08 | `pref_codes` 正常 | `["13","14"]` | 通過 |
| BE-SCH-09 | `pref_codes` 不正コード | `["99"]` | `ValueError` |
| BE-SCH-10 | `pref_codes` 混在 | `["13","99"]` | `ValueError` |
| BE-SCH-11 | `quarter_from=1`（正常） | `quarter_from=1` | 通過 |
| BE-SCH-12 | `quarter_from=0`（下限-1） | `quarter_from=0` | `ValueError` |
| BE-SCH-13 | `quarter_to=4`（上限） | `quarter_to=4` | 通過 |
| BE-SCH-14 | `quarter_to=5`（上限+1） | `quarter_to=5` | `ValueError` |
| BE-SCH-15 | `quarter_from > quarter_to` | `quarter_from=3, quarter_to=1` | `ValueError` |

---

## 14. 単体テスト — `batch/base.py` パース処理

| テスト ID | テストケース | 入力 | 期待結果 |
|----------|------------|------|---------|
| BE-PARSE-01 | 正常なフィーチャー | 全必須フィールド有効 | dict を返す |
| BE-PARSE-02 | `properties` キーなし | `{}` | `None`（スキップ） |
| BE-PARSE-03 | 数値フィールドが null | `price_per_sqm: null` | `None`（SEC-PARSE-02） |
| BE-PARSE-04 | 数値フィールドが文字列 | `price_per_sqm: "abc"` | `None` |
| BE-PARSE-05 | 緯度が範囲外（>90） | `latitude: 91.0` | `None`（SEC-PARSE-03） |
| BE-PARSE-06 | 経度が範囲外（<-180） | `longitude: -181.0` | `None`（SEC-PARSE-03） |
| BE-PARSE-07 | 緯度 = 90.0（境界値） | `latitude: 90.0` | 通過 |
| BE-PARSE-08 | 正常な `trade_period` | `"2024年第3四半期"` | `year=2024, quarter=3` |
| BE-PARSE-09 | 不正な `trade_period` | `"2024年"` | `None`（SEC-PARSE-04） |
| BE-PARSE-10 | `trade_period` が空文字 | `""` | `None` |
| BE-PARSE-11 | 想定外フィールドを含む | `extra_field: "xxx"` を含む | 無視されて正常パース（SEC-PARSE-01） |
| BE-PARSE-12 | 対象外 `city_code` | `city_code: "01101"` | `None`（フィルタ除外） |
| BE-PARSE-13 | 対象内 `city_code` | `city_code: "13101"` | dict を返す |

### upsert テスト

| テスト ID | テストケース | 入力 | 期待結果 |
|----------|------------|------|---------|
| BE-UPSERT-01 | 空リスト | `records=[]` | `0` を返す |
| BE-UPSERT-02 | 新規 INSERT | 既存レコードなし + 1 件 | `1` を返す、レコードが存在する |
| BE-UPSERT-03 | 重複 upsert（ON CONFLICT） | 同一ユニーク制約キーの 2 回呼び出し | エラーなし、`updated_at` が更新される |

---

## 15. 単体テスト — `services/reinfolib.py`

| テスト ID | テストケース | モック設定 | 期待結果 |
|----------|------------|----------|---------|
| BE-REIN-01 | 正常レスポンス | HTTP 200 + GeoJSON | `features` リストを返す |
| BE-REIN-02 | 空フィーチャー | HTTP 200 + `{"features": []}` | 空リスト `[]` |
| BE-REIN-03 | HTTP 429 → リトライ → 成功 | 1 回目 429、2 回目 200 | features を返す |
| BE-REIN-04 | HTTP 429 → リトライ上限超過 | 全リクエストが 429 | 空リスト `[]` |
| BE-REIN-05 | HTTP 401 | HTTP 401 | `RuntimeError` 送出（即時中断） |
| BE-REIN-06 | HTTP 403 | HTTP 403 | `RuntimeError` 送出 |
| BE-REIN-07 | HTTP 500 → リトライ → 成功 | 1 回目 500、2 回目 200 | features を返す |
| BE-REIN-08 | タイムアウト → リトライ上限超過 | 全リクエストがタイムアウト | 空リスト `[]` |
| BE-REIN-09 | ログに APIキー混入なし | 任意エラー発生 | ログに `re_info_lib_key` の値が含まれない（SEC-PARSE-05） |

---

## 16. 単体テスト — `services/job_manager.py`

| テスト ID | テストケース | 操作 | 期待結果 |
|----------|------------|------|---------|
| BE-JM-01 | `create` | `job_type="land_prices"` | UUID 形式の `id`、`status="queued"` |
| BE-JM-02 | `get` 存在あり | 作成後に `get(job_id)` | `BatchJob` オブジェクトを返す |
| BE-JM-03 | `get` 存在なし | 存在しない UUID | `None` を返す |
| BE-JM-04 | `update_status` → running | `status="running"` | `started_at` が設定される |
| BE-JM-05 | `update_status` → completed | `status="completed"` | `finished_at` が設定される |
| BE-JM-06 | `update_status` → failed | `status="failed", error="msg"` | `error_message="msg"` |
| BE-JM-07 | 存在しない job_id への更新 | 存在しない UUID | エラーなく処理を終える |

---

## 17. セキュリティ要件対応テスト

| テスト ID | 要件 | テスト内容 | 期待結果 |
|----------|------|----------|---------|
| BE-SEC-01 | SEC-SECRET-01 | `DATABASE_URL` 未設定で `Settings()` を初期化 | `ValidationError` で起動失敗 |
| BE-SEC-02 | SEC-SECRET-01 | `ADMIN_TOKEN` 未設定で `Settings()` を初期化 | `ValidationError` で起動失敗 |
| BE-SEC-03 | SEC-AUTH-01 | ingest エンドポイントに X-Admin-Token なし | HTTP 403 |
| BE-SEC-04 | SEC-VAL-05 | `city_code` に 5 桁以外の文字列 | HTTP 422 |
| BE-SEC-05 | SEC-VAL-07 | `divergence.py` の VIEW クエリに f-string 埋め込みがないこと | コードレビュー検証 |
| BE-SEC-06 | SEC-DOCKER-01 | compose.yml のポートバインド設定 | 全ポートが `127.0.0.1:` プレフィックスを持つ |
| BE-SEC-07 | SEC-AUTH-04 | CORS 設定 | `allow_origins` が `["http://localhost:3000"]` のみ |

---

## 18. テスト実装ファイル配置

```
backend/
└── tests/
    ├── conftest.py              # DB fixture、TestClient fixture、admin_token fixture
    ├── test_health.py
    ├── test_land_prices.py
    ├── test_transactions.py
    ├── test_divergence.py
    ├── test_ingest.py
    ├── test_jobs.py
    ├── test_dependencies.py
    ├── test_tile_calculator.py
    ├── test_schemas_ingest.py
    ├── test_batch_base.py
    ├── test_reinfolib.py
    ├── test_job_manager.py
    └── test_security.py
```
