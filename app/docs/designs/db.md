# DB 詳細設計書

**プロジェクト**: Real Estate Insight (REI)
**バージョン**: 1.0.0
**作成日**: 2026-04-27
**担当フェーズ**: システム詳細設計 — designer

---

## 1. 概要

PostgreSQL 16 を使用し、SQLAlchemy ORM による `create_all` + 起動時スクリプトでスキーマを管理する（Alembic は採用しない）。

### 対象テーブル・ビュー一覧

| 名称 | 種別 | 概要 |
|------|------|------|
| `raw_land_prices` | テーブル | 地価公示データ（XPT002）生データ |
| `raw_transaction_prices` | テーブル | 不動産取引価格データ（XPT001）生データ |
| `batch_jobs` | テーブル | バッチジョブ実行状態管理 |
| `v_price_divergence` | VIEW | 地価公示と取引価格の乖離幅集計 |

---

## 2. テーブル定義

### 2.1 `raw_land_prices`（既存・カラム追加）

#### 追加カラム

| カラム名 | 型 | NULL | 備考 |
|---------|-----|------|------|
| `price_classification` | `VARCHAR(5)` | NULL | 地価区分 ※要確認 |
| `city_planning` | `VARCHAR(50)` | NULL | 都市計画区域区分 |
| `coverage_ratio` | `INTEGER` | NULL | 建蔽率（%） |
| `floor_area_ratio` | `INTEGER` | NULL | 容積率（%） |
| `updated_at` | `TIMESTAMP` | NULL | upsert 更新日時 |

#### 追加インデックス

```sql
INDEX (prefecture_code, year)   -- ix_land_price_pref_year
INDEX (year, land_use)          -- ix_land_price_year_use
```

#### 既存制約（維持）

```sql
UNIQUE (city_code, year, address)  -- uq_land_price_entry, postgresql_nulls_not_distinct=True
```

---

### 2.2 `raw_transaction_prices`（新規）

#### カラム定義

| カラム名 | 型 | NULL | 備考 |
|---------|-----|------|------|
| `id` | `INTEGER` | NOT NULL | PK・AUTO INCREMENT |
| `city_code` | `VARCHAR(5)` | NOT NULL | JIS X 0402 5桁 |
| `prefecture_name` | `VARCHAR(10)` | NOT NULL | |
| `city_name` | `VARCHAR(50)` | NOT NULL | |
| `district_name` | `VARCHAR(100)` | NULL | |
| `transaction_type` | `VARCHAR(20)` | NULL | 例: "宅地(土地)" ※要確認 |
| `region` | `VARCHAR(20)` | NULL | 地域区分 |
| `trade_price` | `BIGINT` | NULL | 取引価格総額（円） |
| `price_per_sqm` | `BIGINT` | NULL | 単価（円/㎡）。NULL あり |
| `price_per_tsubo` | `BIGINT` | NULL | 単価（円/坪）。NULL あり |
| `area_sqm` | `FLOAT` | NULL | 面積（㎡） |
| `land_shape` | `VARCHAR(20)` | NULL | 土地の形状 |
| `frontage` | `FLOAT` | NULL | 間口（m） |
| `total_floor_area` | `FLOAT` | NULL | 延床面積（㎡） |
| `building_year` | `INTEGER` | NULL | 建築年 |
| `structure` | `VARCHAR(20)` | NULL | 建物構造 |
| `current_use` | `VARCHAR(50)` | NULL | 現況の用途 |
| `future_use` | `VARCHAR(50)` | NULL | 利用目的（将来） |
| `city_planning` | `VARCHAR(50)` | NULL | 都市計画区域区分 |
| `coverage_ratio` | `INTEGER` | NULL | 建蔽率（%） |
| `floor_area_ratio` | `INTEGER` | NULL | 容積率（%） |
| `road_direction` | `VARCHAR(10)` | NULL | 接道方位 |
| `road_classification` | `VARCHAR(20)` | NULL | 接道種類 |
| `road_breadth` | `FLOAT` | NULL | 接道幅員（m） |
| `trade_period` | `VARCHAR(10)` | NULL | 例: "2024年第1四半期" |
| `floor_plan` | `VARCHAR(20)` | NULL | 間取り |
| `renovation` | `VARCHAR(10)` | NULL | 改装の有無 |
| `remarks` | `TEXT` | NULL | 取引の事情等 |
| `latitude` | `FLOAT` | NULL | WGS84（最寄り駅座標の場合あり） |
| `longitude` | `FLOAT` | NULL | WGS84 |
| `year` | `INTEGER` | NULL | `trade_period` から抽出 |
| `quarter` | `INTEGER` | NULL | 1〜4。`trade_period` から抽出 |
| `created_at` | `TIMESTAMP` | NOT NULL | `NOW()` |
| `updated_at` | `TIMESTAMP` | NULL | upsert 更新日時 |

#### 制約・インデックス

```sql
PRIMARY KEY (id)
UNIQUE (city_code, trade_period, district_name, trade_price, area_sqm, transaction_type)
  -- uq_transaction_price_entry, postgresql_nulls_not_distinct=True
INDEX (city_code, year, quarter)    -- ix_transaction_city_year_q
INDEX (city_code, transaction_type) -- ix_transaction_city_type
INDEX (year, quarter)               -- ix_transaction_year_q
```

> **根拠**: XPT001 は取引地点ではなく最寄り駅座標を返すため、緯度経度による一意性担保が困難。

#### SQLAlchemy モデル（`backend/app/models/transaction_price.py`）

```python
from sqlalchemy import BigInteger, Column, DateTime, Float, Integer, String, Text, UniqueConstraint, func

from app.database import Base


class RawTransactionPrice(Base):
    __tablename__ = "raw_transaction_prices"

    id                  = Column(Integer, primary_key=True, index=True)
    city_code           = Column(String(5), nullable=False, index=True)
    prefecture_name     = Column(String(10), nullable=False)
    city_name           = Column(String(50), nullable=False)
    district_name       = Column(String(100))
    transaction_type    = Column(String(20))
    region              = Column(String(20))
    trade_price         = Column(BigInteger)
    price_per_sqm       = Column(BigInteger)
    price_per_tsubo     = Column(BigInteger)
    area_sqm            = Column(Float)
    land_shape          = Column(String(20))
    frontage            = Column(Float)
    total_floor_area    = Column(Float)
    building_year       = Column(Integer)
    structure           = Column(String(20))
    current_use         = Column(String(50))
    future_use          = Column(String(50))
    city_planning       = Column(String(50))
    coverage_ratio      = Column(Integer)
    floor_area_ratio    = Column(Integer)
    road_direction      = Column(String(10))
    road_classification = Column(String(20))
    road_breadth        = Column(Float)
    trade_period        = Column(String(10))
    floor_plan          = Column(String(20))
    renovation          = Column(String(10))
    remarks             = Column(Text)
    latitude            = Column(Float)
    longitude           = Column(Float)
    year                = Column(Integer)
    quarter             = Column(Integer)
    created_at          = Column(DateTime, server_default=func.now())
    updated_at          = Column(DateTime)

    __table_args__ = (
        UniqueConstraint(
            "city_code", "trade_period", "district_name",
            "trade_price", "area_sqm", "transaction_type",
            name="uq_transaction_price_entry",
            postgresql_nulls_not_distinct=True,
        ),
    )
```

---

### 2.3 `batch_jobs`（新規）

| カラム名 | 型 | NULL | 備考 |
|---------|-----|------|------|
| `id` | `VARCHAR(36)` | NOT NULL | PK。UUID v4 |
| `job_type` | `VARCHAR(20)` | NOT NULL | `"land_prices"` または `"transactions"` |
| `status` | `VARCHAR(20)` | NOT NULL | `queued` / `running` / `completed` / `failed` / `partial` |
| `params` | `JSON` | NOT NULL | リクエストパラメータ（APIキーは含めない） |
| `progress` | `JSON` | NULL | `{total_tiles, processed_tiles, upserted, skipped, errors}` |
| `error_message` | `TEXT` | NULL | エラー詳細 |
| `started_at` | `DATETIME` | NULL | 実行開始日時 |
| `finished_at` | `DATETIME` | NULL | 完了日時 |
| `created_at` | `DATETIME` | NOT NULL | `NOW()` |

#### SQLAlchemy モデル（`backend/app/models/batch_job.py`）

```python
import uuid
from sqlalchemy import Column, DateTime, JSON, String, Text, func

from app.database import Base


class BatchJob(Base):
    __tablename__ = "batch_jobs"

    id            = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_type      = Column(String(20), nullable=False)
    status        = Column(String(20), nullable=False, default="queued")
    params        = Column(JSON, nullable=False)
    progress      = Column(JSON)
    error_message = Column(Text)
    started_at    = Column(DateTime)
    finished_at   = Column(DateTime)
    created_at    = Column(DateTime, server_default=func.now())
```

---

## 3. VIEW 定義

### `v_price_divergence`

```sql
CREATE OR REPLACE VIEW v_price_divergence AS
SELECT
    lp.city_code,
    lp.city_name,
    lp.prefecture_name,
    lp.year,
    ROUND(AVG(lp.price_per_sqm))              AS avg_published_price,
    ROUND(AVG(tp.price_per_sqm))              AS avg_transaction_price,
    ROUND(
        (AVG(tp.price_per_sqm) - AVG(lp.price_per_sqm))
        / NULLIF(AVG(lp.price_per_sqm), 0)
        * 100,
    2)                                         AS divergence_rate,
    COUNT(DISTINCT lp.id)                      AS published_count,
    COUNT(DISTINCT tp.id)                      AS transaction_count
FROM raw_land_prices lp
INNER JOIN raw_transaction_prices tp
    ON lp.city_code = tp.city_code
    AND lp.year     = tp.year
    AND tp.transaction_type IN ('宅地(土地)', '宅地(土地と建物)')
WHERE lp.price_per_sqm IS NOT NULL
  AND tp.price_per_sqm IS NOT NULL
GROUP BY lp.city_code, lp.city_name, lp.prefecture_name, lp.year;
```

`divergence_rate` > 0: 取引価格が公示地価を上回る（割高）。< 0: 割安。

---

## 4. `database.py` — `init_db()` 変更案

```python
from sqlalchemy import text

VIEW_SQL = """
CREATE OR REPLACE VIEW v_price_divergence AS
SELECT
    lp.city_code, lp.city_name, lp.prefecture_name, lp.year,
    ROUND(AVG(lp.price_per_sqm))                                AS avg_published_price,
    ROUND(AVG(tp.price_per_sqm))                                AS avg_transaction_price,
    ROUND(
        (AVG(tp.price_per_sqm) - AVG(lp.price_per_sqm))
        / NULLIF(AVG(lp.price_per_sqm), 0) * 100, 2
    )                                                            AS divergence_rate,
    COUNT(DISTINCT lp.id)                                        AS published_count,
    COUNT(DISTINCT tp.id)                                        AS transaction_count
FROM raw_land_prices lp
INNER JOIN raw_transaction_prices tp
    ON lp.city_code = tp.city_code
   AND lp.year      = tp.year
   AND tp.transaction_type IN ('宅地(土地)', '宅地(土地と建物)')
WHERE lp.price_per_sqm IS NOT NULL
  AND tp.price_per_sqm IS NOT NULL
GROUP BY lp.city_code, lp.city_name, lp.prefecture_name, lp.year
"""


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text(VIEW_SQL))
        conn.commit()
```

`text()` 内はリテラルのみ。ユーザー入力は絶対に埋め込まない（SEC-VAL-07）。

---

## 5. マイグレーション方針

- Alembic は採用しない
- `raw_land_prices` へのカラム追加は手動 `ALTER TABLE` または `docker compose down -v && docker compose up` で再作成
- VIEW は `CREATE OR REPLACE` のためアプリ再起動で適用される

---

## 6. データ量見積もり

| テーブル | 推定件数 |
|---------|---------|
| `raw_land_prices` | 数万〜十数万件 |
| `raw_transaction_prices` | 数十万〜百万件超 |
| `batch_jobs` | 数十〜数百件 |

`v_price_divergence` クエリが 2 秒を超えたらマテリアライズド VIEW への切り替えを検討する。
