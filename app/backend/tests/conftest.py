"""
共通テスト設定 / フィクスチャ
- SQLite インメモリ DB を利用（PostgreSQL 不要）
- TestClient フィクスチャ
- admin_token フィクスチャ
"""
import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ["ADMIN_TOKEN"] = "test-admin-token"

from app.config import settings  # noqa: E402
settings.admin_token = "test-admin-token"
settings.re_info_lib_key = ""

from app.database import Base  # noqa: E402


# ---------------------------------------------------------------------------
# DB フィクスチャ（SQLite インメモリ）
# ---------------------------------------------------------------------------

_SQLITE_VIEW_SQL = """
CREATE VIEW IF NOT EXISTS v_price_divergence AS
SELECT
    lp.city_code,
    lp.city_name,
    lp.prefecture_name,
    lp.year,
    CAST(ROUND(AVG(lp.price_per_sqm)) AS INTEGER)        AS avg_published_price,
    CAST(ROUND(AVG(tp.price_per_sqm)) AS INTEGER)        AS avg_transaction_price,
    ROUND(
        (AVG(tp.price_per_sqm) - AVG(lp.price_per_sqm))
        / MAX(AVG(lp.price_per_sqm), 0.001) * 100,
    2)                                                    AS divergence_rate,
    COUNT(DISTINCT lp.id)                                 AS published_count,
    COUNT(DISTINCT tp.id)                                 AS transaction_count
FROM raw_land_prices lp
INNER JOIN raw_transaction_prices tp
    ON lp.city_code = tp.city_code
   AND lp.year      = tp.year
   AND tp.transaction_type IN ('宅地(土地)', '宅地(土地と建物)')
WHERE lp.price_per_sqm IS NOT NULL
  AND tp.price_per_sqm IS NOT NULL
GROUP BY lp.city_code, lp.city_name, lp.prefecture_name, lp.year
"""

# SQLite 用の divergence クエリ（LEFT() を SUBSTR() に置換）
_SQLITE_DIVERGENCE_QUERY = """
SELECT city_code, city_name, prefecture_name, year,
       avg_published_price, avg_transaction_price, divergence_rate,
       published_count, transaction_count
FROM v_price_divergence
WHERE (:prefecture_code IS NULL OR SUBSTR(city_code, 1, 2) = :prefecture_code)
  AND (:city_code IS NULL OR city_code = :city_code)
  AND (:year_from IS NULL OR year >= :year_from)
  AND (:year_to IS NULL OR year <= :year_to)
ORDER BY city_code, year
"""


@pytest.fixture(scope="function")
def db_engine():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text(_SQLITE_VIEW_SQL))
        conn.commit()
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(db_engine):
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client(db_session):
    from app.database import get_db
    import main as main_module
    app = main_module.app

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def admin_headers():
    return {"X-Admin-Token": "test-admin-token"}
