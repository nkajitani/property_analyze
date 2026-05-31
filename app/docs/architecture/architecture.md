# システムアーキテクチャ設計（REI プロジェクト）

**バージョン**: 1.0.0  
**作成日**: 2026-04-27  
**担当フェーズ**: アーキテクチャ設計 — architect

---

## 1. バッチ非同期化方式の決定

### 採用方式: FastAPI BackgroundTasks + PostgreSQL `batch_jobs` テーブル

| 選択肢 | 評価 |
|--------|------|
| A: FastAPI BackgroundTasks | **採用**。シンプルで追加コンテナ不要。ジョブ状態管理の欠点は DB テーブルで解消 |
| B: APScheduler | スケジューリング不要なのでミスマッチ |
| C: Celery + Redis | 過剰設計。Redis コンテナが必要になる |
| D: subprocess | ジョブ状態管理が不確実 |

**理由**: 個人利用・ローカル環境に対して Celery は過剰。BackgroundTasks の「状態管理が難しい」欠点は PostgreSQL に `batch_jobs` テーブルを設けてバッチ関数が直接 UPDATE することで解消する。

### `batch_jobs` テーブル定義

```python
class BatchJob(Base):
    __tablename__ = "batch_jobs"

    id          = Column(String(36), primary_key=True)   # UUID
    job_type    = Column(String(20), nullable=False)      # "land_prices" | "transactions"
    status      = Column(String(20), nullable=False)      # queued|running|completed|failed|partial
    params      = Column(JSON, nullable=False)             # リクエストパラメータ
    progress    = Column(JSON, nullable=True)              # total_tiles, processed_tiles, etc.
    error_message = Column(Text, nullable=True)
    started_at  = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    created_at  = Column(DateTime, server_default=func.now())
```

---

## 2. ディレクトリ構成

```
backend/
├── app/
│   ├── config.py
│   ├── database.py              # init_db() に CREATE OR REPLACE VIEW を追加
│   ├── models/
│   │   ├── land_price.py        # RawLandPrice（既存）
│   │   ├── transaction_price.py # RawTransactionPrice（新規）
│   │   └── batch_job.py         # BatchJob（新規）
│   ├── schemas/
│   │   ├── land_price.py        # 既存
│   │   ├── transaction_price.py # TransactionCityAnnualSummary（新規）
│   │   ├── divergence.py        # CityPriceDivergence（新規）
│   │   └── ingest.py            # IngestRequest / JobStatusResponse（新規）
│   ├── routers/
│   │   ├── land_prices.py       # 既存
│   │   ├── transactions.py      # GET /transactions/summary/cities（新規）
│   │   ├── divergence.py        # GET /divergence/cities（新規）
│   │   └── ingest.py            # POST 起動 + GET 状態確認（新規）
│   ├── services/
│   │   ├── reinfolib.py         # API クライアント・リトライロジック
│   │   ├── tile_calculator.py   # bbox → Slippy Map Tiles (z=12)
│   │   └── job_manager.py       # BatchJob CRUD
│   └── batch/
│       ├── base.py              # 共通処理（タイル取得・upsert・ログ）
│       ├── fetch_land_prices.py # XPT002（スタンドアロン + BackgroundTasks 両対応）
│       └── fetch_transaction_prices.py  # XPT001
└── main.py
```

---

## 3. データフロー

### 3.1 バッチ起動フロー

```
[POST /api/v1/ingest/transactions]
    │
    ├─ 1. X-Admin-Token 検証（Depends）
    ├─ 2. リクエストボディバリデーション（pydantic）
    ├─ 3. BatchJob レコード作成（status=queued）→ job_id を 202 で返却
    │
    └─ 4. BackgroundTasks.add_task(fetch_transaction_prices, job_id, params)
               │
               ├─ 5. job status → running
               ├─ 6. GeoJSON 読込（municipalities.geojson）→ bbox 取得
               ├─ 7. tile_calculator: bbox → タイルリスト (z=12)
               │
               └─ [タイルループ]
                      ├─ 8. reinfolib.py: GET XPT001（Ocp-Apim-Subscription-Key ヘッダー）
                      │       リトライ: 指数バックオフ（最大3回）
                      ├─ 9. pydantic パース（extra=ignore、型チェック）
                      ├─ 10. city_code フィルタ（一都三県外を除外）
                      ├─ 11. upsert（ON CONFLICT DO UPDATE SET updated_at）
                      └─ 12. progress カラム更新
               │
               └─ 13. job status → completed / partial / failed
```

### 3.2 フロントエンド → データ取得フロー

```
[Next.js fetch]
    │
    ├─ next.config.ts rewrites
    │       /api/* → http://backend:8000/api/*
    │
    └─ FastAPI ルーター
            │
            ├─ GET /api/v1/land-prices/summary/cities
            │       → SQLAlchemy GROUP BY → CityAnnualSummary[]
            │
            ├─ GET /api/v1/transactions/summary/cities
            │       → SQLAlchemy GROUP BY（annual / quarterly）→ TransactionCityAnnualSummary[]
            │
            └─ GET /api/v1/divergence/cities
                    → SELECT * FROM v_price_divergence → CityPriceDivergence[]
```

### 3.3 乖離幅 VIEW クエリフロー

```
v_price_divergence
    = raw_land_prices（XPT002）
      INNER JOIN raw_transaction_prices（XPT001）
      ON city_code = city_code AND year = year
      WHERE transaction_type IN ('宅地(土地)', '宅地(土地と建物)')
    GROUP BY city_code, city_name, prefecture_name, year
    → AVG(price_per_sqm) 双方で計算
    → divergence_rate = (avg_transaction - avg_published) / avg_published * 100
```

---

## 4. DB マイグレーション方針

**Alembic は不採用**（個人利用・ローカル環境のため過剰）。

- `Base.metadata.create_all()` を継続
- `database.py` の `init_db()` に `v_price_divergence` の `CREATE OR REPLACE VIEW` SQL を追加し、アプリ起動時に毎回実行
- `batch_jobs` テーブルも `create_all()` で自動作成

```python
# database.py の init_db() に追加
def init_db():
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE OR REPLACE VIEW v_price_divergence AS
            SELECT ...
        """))
        conn.commit()
```

---

## 5. compose.yml 変更点

1. `backend` サービスに `env_file: ./backend/.env` を追加（`RE_INFO_LIB_KEY` の安全なロード）
2. `CORS_ORIGINS` から `http://localhost:5173` を削除（Next.js 移行済み）
3. 全ポートを `127.0.0.1` バインドに変更（security 要件 SEC-DOCKER-01）
4. Redis 等の追加コンテナは不要

---

## 6. 設計上の主要決定事項まとめ

| 項目 | 採用決定 | 理由 |
|------|---------|------|
| バッチ非同期化 | BackgroundTasks + `batch_jobs` テーブル | 追加コンテナ不要・シンプル |
| マイグレーション | `create_all` + 起動スクリプト | Alembic は過剰設計 |
| 乖離幅 | 通常 VIEW | 現状の規模では十分。不足時にマテリアライズドに切替 |
| 並列 API リクエスト | `asyncio.Semaphore(3)` で制御 | レートリミット対策 |
| ジョブ状態管理 | `batch_jobs` テーブル（PostgreSQL） | 再起動後も状態が残る |

---

## 7. security-reviewer への引き継ぎ事項

architect が特定したセキュリティ対応が必要な設計点:

- `batch_jobs.params` に `RE_INFO_LIB_KEY` を含めないこと
- `X-Admin-Token` の検証は `Depends` で実装し、将来の差し替えを容易にすること
- `init_db()` 内の `text()` SQL は固定リテラルのみ使用し、ユーザー入力は絶対に埋め込まないこと
