# バックエンド詳細設計書

**プロジェクト**: Real Estate Insight (REI)
**バージョン**: 1.0.0
**作成日**: 2026-04-27
**担当フェーズ**: システム詳細設計 — designer

---

## 1. 技術スタック

| 要素 | 技術 |
|------|------|
| フレームワーク | FastAPI（Python 3.11+） |
| ORM | SQLAlchemy 2.x |
| バリデーション | pydantic v2 + pydantic-settings |
| 非同期バッチ | FastAPI BackgroundTasks |
| HTTP クライアント | httpx（async） |
| DB | PostgreSQL 16 |
| サーバー | uvicorn（--reload） |

---

## 2. ディレクトリ構成

```
backend/
├── main.py
├── app/
│   ├── config.py
│   ├── database.py
│   ├── dependencies.py              # verify_admin_token
│   ├── models/
│   │   ├── land_price.py            # 既存
│   │   ├── transaction_price.py     # 新規
│   │   └── batch_job.py             # 新規
│   ├── schemas/
│   │   ├── land_price.py            # 既存
│   │   ├── transaction_price.py     # 新規
│   │   ├── divergence.py            # 新規
│   │   └── ingest.py                # 新規
│   ├── routers/
│   │   ├── land_prices.py           # 既存
│   │   ├── transactions.py          # 新規
│   │   ├── divergence.py            # 新規
│   │   └── ingest.py                # 新規
│   ├── services/
│   │   ├── reinfolib.py             # API クライアント・リトライロジック
│   │   ├── tile_calculator.py       # bbox → Slippy Map Tiles
│   │   └── job_manager.py           # BatchJob CRUD
│   └── batch/
│       ├── base.py
│       ├── fetch_land_prices.py
│       └── fetch_transaction_prices.py
├── .env
├── .env.example
└── Dockerfile
```

---

## 3. `main.py` — エントリポイント設計

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.routers import land_prices, transactions, divergence, ingest

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="Real Estate Insight API", version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(land_prices.router,  prefix="/api/v1/land-prices",  tags=["land-prices"])
app.include_router(transactions.router, prefix="/api/v1/transactions", tags=["transactions"])
app.include_router(ingest.router,       prefix="/api/v1/ingest",       tags=["ingest"])
app.include_router(divergence.router,   prefix="/api/v1/divergence",   tags=["divergence"])
```

---

## 4. `config.py` — 設定

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str                                      # 必須・デフォルト値なし（SEC-SECRET-01）
    admin_token: str                                       # 必須・デフォルト値なし（SEC-AUTH-02）
    re_info_lib_key: str = ""
    cors_origins: list[str] = ["http://localhost:3000"]
    batch_zoom_level: int = 13
    batch_request_timeout_sec: int = 30
    batch_max_retries: int = 3
    batch_retry_backoff_base_sec: float = 2.0
    batch_concurrent_requests: int = 3
    default_pref_codes: list[str] = ["13", "14", "11", "12"]

    model_config = {"env_file": ".env"}


settings = Settings()
```

---

## 5. `dependencies.py` — 認証 Depends

```python
from fastapi import Header, HTTPException
from app.config import settings


async def verify_admin_token(x_admin_token: str = Header(...)) -> None:
    """ingest エンドポイントへの X-Admin-Token 認証（SEC-AUTH-01）"""
    if x_admin_token != settings.admin_token:
        raise HTTPException(status_code=403, detail="認証に失敗しました")
```

`POST /api/v1/ingest/*` と `GET /api/v1/ingest/jobs/{job_id}` に `Depends(verify_admin_token)` を適用する。

---

## 6. pydantic スキーマ定義

### `schemas/transaction_price.py`（新規）

```python
from pydantic import BaseModel


class TransactionCityAnnualSummary(BaseModel):
    city_code: str
    city_name: str
    prefecture_name: str
    year: int
    quarter: int | None
    avg_price_per_sqm: float
    min_price_per_sqm: int
    max_price_per_sqm: int
    avg_trade_price: float
    record_count: int
```

### `schemas/divergence.py`（新規）

```python
from pydantic import BaseModel


class CityPriceDivergence(BaseModel):
    city_code: str
    city_name: str
    prefecture_name: str
    year: int
    avg_published_price: int
    avg_transaction_price: int
    divergence_rate: float      # 正 = 取引価格 > 公示地価（%）
    published_count: int
    transaction_count: int
```

### `schemas/ingest.py`（新規）

```python
from datetime import datetime
from pydantic import BaseModel, model_validator, field_validator

ALLOWED_PREF_CODES = {"11", "12", "13", "14"}
_CURRENT_YEAR = datetime.now().year


class LandPriceIngestRequest(BaseModel):
    year_from: int
    year_to: int
    pref_codes: list[str] = ["13", "14", "11", "12"]
    dry_run: bool = False

    @field_validator("year_from", "year_to")
    @classmethod
    def validate_year_range(cls, v: int) -> int:
        if not (2000 <= v <= _CURRENT_YEAR + 1):
            raise ValueError(f"year は 2000〜{_CURRENT_YEAR + 1} の範囲で指定してください")
        return v

    @model_validator(mode="after")
    def validate_year_order(self) -> "LandPriceIngestRequest":
        if self.year_from > self.year_to:
            raise ValueError("year_from は year_to 以下にしてください")
        return self

    @field_validator("pref_codes")
    @classmethod
    def validate_pref_codes(cls, v: list[str]) -> list[str]:
        invalid = set(v) - ALLOWED_PREF_CODES
        if invalid:
            raise ValueError(f"無効な都道府県コード: {invalid}")
        return v


class TransactionIngestRequest(LandPriceIngestRequest):
    quarter_from: int = 1
    quarter_to: int = 4

    @field_validator("quarter_from", "quarter_to")
    @classmethod
    def validate_quarter(cls, v: int) -> int:
        if not (1 <= v <= 4):
            raise ValueError("quarter は 1〜4 で指定してください")
        return v

    @model_validator(mode="after")
    def validate_quarter_order(self) -> "TransactionIngestRequest":
        if self.quarter_from > self.quarter_to:
            raise ValueError("quarter_from は quarter_to 以下にしてください")
        return self


class JobStatusResponse(BaseModel):
    job_id: str
    job_type: str
    status: str
    progress: dict | None
    started_at: str | None
    finished_at: str | None
    error_message: str | None
```

---

## 7. ルーター設計

### `routers/transactions.py`（新規）

`GET /api/v1/transactions/summary/cities`

- `city_code` クエリパラメータは `^[0-9]{5}$` で正規表現バリデーション（SEC-VAL-05）
- `aggregate_by` が `"quarterly"` の場合は `quarter` カラムも GROUP BY に含める
- SQLAlchemy ORM クエリで実装（生 SQL 不使用）

### `routers/divergence.py`（新規）

`GET /api/v1/divergence/cities`

```python
from sqlalchemy import text

VIEW_QUERY = """
SELECT city_code, city_name, prefecture_name, year,
       avg_published_price, avg_transaction_price, divergence_rate,
       published_count, transaction_count
FROM v_price_divergence
WHERE (:prefecture_code IS NULL OR LEFT(city_code, 2) = :prefecture_code)
  AND (:city_code IS NULL OR city_code = :city_code)
  AND (:year_from IS NULL OR year >= :year_from)
  AND (:year_to IS NULL OR year <= :year_to)
ORDER BY city_code, year
"""

rows = db.execute(
    text(VIEW_QUERY).bindparams(
        prefecture_code=prefecture_code,
        city_code=city_code,
        year_from=year_from,
        year_to=year_to,
    )
).fetchall()
```

f-string によるユーザー入力の埋め込み禁止（SEC-VAL-07）。

### `routers/ingest.py`（新規）

```python
@router.post("/land-prices", dependencies=[Depends(verify_admin_token)], status_code=202)
async def ingest_land_prices(
    payload: LandPriceIngestRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict:
    if not settings.re_info_lib_key:
        raise HTTPException(status_code=503, detail="RE_INFO_LIB_KEY が未設定です")
    job = job_manager.create(db, job_type="land_prices", params=payload.model_dump())
    background_tasks.add_task(run_fetch_land_prices, job.id, payload, db)
    return {"job_id": job.id, "status": "queued", "message": "バッチジョブをキューに登録しました。"}
```

---

## 8. `services/tile_calculator.py`

```python
import math
from collections.abc import Iterator


def _lat_lon_to_tile(lat: float, lon: float, zoom: int) -> tuple[int, int]:
    x = int((lon + 180.0) / 360.0 * (2 ** zoom))
    lat_rad = math.radians(lat)
    y = int((1.0 - math.log(math.tan(lat_rad) + 1.0 / math.cos(lat_rad)) / math.pi) / 2.0 * (2 ** zoom))
    return x, y


def bbox_to_tiles(
    min_lat: float,
    min_lon: float,
    max_lat: float,
    max_lon: float,
    zoom: int,
) -> Iterator[tuple[int, int, int]]:
    """bounding box を覆う Slippy Map タイル座標を列挙する（z, x, y）"""
    x_min, y_max = _lat_lon_to_tile(min_lat, min_lon, zoom)
    x_max, y_min = _lat_lon_to_tile(max_lat, max_lon, zoom)
    for x in range(x_min, x_max + 1):
        for y in range(y_min, y_max + 1):
            yield zoom, x, y
```

---

## 9. `services/reinfolib.py`

```python
import asyncio
import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)
BASE_URL = "https://www.reinfolib.mlit.go.jp/ex-api/external"


class ReinfilibClient:
    def __init__(self) -> None:
        self._semaphore = asyncio.Semaphore(settings.batch_concurrent_requests)

    async def fetch_tile(
        self,
        endpoint: str,      # "XPT001" または "XPT002"
        z: int, x: int, y: int,
        extra_params: dict,
    ) -> list[dict]:
        """1タイル分の GeoJSON features を返す。エラー時は空リストを返す。"""
        params = {"response_format": "geojson", "z": z, "x": x, "y": y, **extra_params}
        headers = {"Ocp-Apim-Subscription-Key": settings.re_info_lib_key}

        async with self._semaphore:
            for attempt in range(settings.batch_max_retries + 1):
                try:
                    async with httpx.AsyncClient(timeout=settings.batch_request_timeout_sec) as client:
                        resp = await client.get(f"{BASE_URL}/{endpoint}", params=params, headers=headers)
                    if resp.status_code in (401, 403):
                        logger.error("API 認証エラー（%d）。バッチを中断します。", resp.status_code)
                        raise RuntimeError("API 認証エラー")
                    if resp.status_code == 429:
                        wait = settings.batch_retry_backoff_base_sec ** attempt
                        logger.warning("Rate limit (429)。%.1f 秒後にリトライします。", wait)
                        await asyncio.sleep(wait)
                        continue
                    resp.raise_for_status()
                    data = resp.json()
                    return data.get("features", [])
                except (httpx.TimeoutException, httpx.HTTPStatusError) as e:
                    if attempt == settings.batch_max_retries:
                        # APIキーをログに含めない（SEC-PARSE-05・SEC-SECRET-03）
                        logger.warning("タイル (%d,%d,%d) 取得失敗。スキップします。エラー: %s", z, x, y, type(e).__name__)
                        return []
                    await asyncio.sleep(settings.batch_retry_backoff_base_sec ** attempt)
        return []
```

---

## 10. `services/job_manager.py`

```python
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.batch_job import BatchJob


class JobManager:
    def create(self, db: Session, job_type: str, params: dict) -> BatchJob:
        job = BatchJob(id=str(uuid.uuid4()), job_type=job_type, status="queued", params=params)
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    def get(self, db: Session, job_id: str) -> BatchJob | None:
        return db.get(BatchJob, job_id)

    def update_status(
        self,
        db: Session,
        job_id: str,
        status: str,
        progress: dict | None = None,
        error: str | None = None,
    ) -> None:
        job = db.get(BatchJob, job_id)
        if not job:
            return
        job.status = status
        if progress is not None:
            job.progress = progress
        if error is not None:
            job.error_message = error
        if status == "running" and job.started_at is None:
            job.started_at = datetime.now(timezone.utc)
        if status in ("completed", "failed", "partial"):
            job.finished_at = datetime.now(timezone.utc)
        db.commit()


job_manager = JobManager()
```

---

## 11. `batch/base.py` — 共通バッチ処理

### `parse_transaction_feature(feature: dict) -> dict | None`

```
1. feature["properties"] を取得（KeyError は None を返す）
2. pydantic モデル TransactionFeatureProps で extra='ignore' パース（SEC-PARSE-01）
3. 数値フィールドが null や不正型の場合はレコードスキップ（SEC-PARSE-02）
4. latitude/longitude 値域チェック: -90〜90 / -180〜180（SEC-PARSE-03）
5. trade_period → year/quarter 抽出: r"(\d{4})年第([1-4])四半期"（SEC-PARSE-04）
6. 不正フォーマット時はレコードスキップ
7. city_code フィルタ（対象都道府県コードのプレフィックスで判定）
```

### `upsert_records(db, model_cls, records, constraint) -> int`

```python
from sqlalchemy.dialects.postgresql import insert

def upsert_records(db, model_cls, records, constraint):
    if not records:
        return 0
    stmt = insert(model_cls).values(records)
    stmt = stmt.on_conflict_do_update(
        constraint=constraint,
        set_={"updated_at": datetime.now(timezone.utc)},
    )
    db.execute(stmt)
    db.commit()
    return len(records)
```

---

## 12. `batch/fetch_transaction_prices.py`

CLIエントリポイント（`__main__` ブロック）の引数:

```
--year-from YYYY    取得開始年（必須）
--year-to   YYYY    取得終了年（必須）
--quarter-from Q    開始四半期（デフォルト=1）
--quarter-to   Q    終了四半期（デフォルト=4）
--pref-codes 13,14,11,12   対象都道府県コード
--dry-run           DB書き込みなしで実行
--log-level DEBUG|INFO|WARNING
```

---

## 13. API エンドポイント一覧

| メソッド | パス | 認証 | 概要 |
|---------|------|------|------|
| `GET` | `/health` | なし | ヘルスチェック |
| `GET` | `/api/v1/land-prices/` | なし | 地価公示一覧 |
| `POST` | `/api/v1/land-prices/` | なし | 地価公示1件登録 |
| `GET` | `/api/v1/land-prices/summary/cities` | なし | 地価公示 市区町村サマリー |
| `GET` | `/api/v1/transactions/summary/cities` | なし | 取引価格 市区町村サマリー |
| `GET` | `/api/v1/divergence/cities` | なし | 乖離幅 市区町村サマリー |
| `POST` | `/api/v1/ingest/land-prices` | X-Admin-Token | 地価公示バッチ起動 |
| `POST` | `/api/v1/ingest/transactions` | X-Admin-Token | 取引価格バッチ起動 |
| `GET` | `/api/v1/ingest/jobs/{job_id}` | X-Admin-Token | バッチジョブ状態確認 |

---

## 14. セキュリティ要件対応

| 要件 ID | 対応 |
|---------|------|
| SEC-SECRET-01 | `database_url` / `admin_token` はデフォルト値なしで定義 |
| SEC-SECRET-03 | `reinfolib.py` でリクエストヘッダーをログ出力しない |
| SEC-AUTH-01 | `dependencies.verify_admin_token` を ingest エンドポイントに適用 |
| SEC-AUTH-02 | `admin_token` を `.env` 管理・`Depends` で差し替え容易に |
| SEC-VAL-01〜04 | `ingest.py` スキーマの pydantic バリデーション |
| SEC-VAL-05 | `city_code` クエリパラメータを `^[0-9]{5}$` で検証 |
| SEC-PARSE-01〜05 | `batch/base.py` の防御的パース実装 |
| SEC-VAL-07 | `divergence.py` ルーターで `text().bindparams()` を使用 |
