from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

_VIEW_SQL = """
CREATE OR REPLACE VIEW v_price_divergence AS
SELECT
    lp.city_code,
    lp.city_name,
    lp.prefecture_name,
    lp.year,
    ROUND(AVG(lp.price_per_sqm))                                AS avg_published_price,
    ROUND(AVG(tp.price_per_sqm))                                AS avg_transaction_price,
    ROUND(
        (AVG(tp.price_per_sqm) - AVG(lp.price_per_sqm))
        / NULLIF(AVG(lp.price_per_sqm), 0) * 100,
    2)                                                           AS divergence_rate,
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

_VIEW_TOWN_SQL = """
CREATE OR REPLACE VIEW v_price_divergence_town AS
SELECT
    tp.city_code,
    tp.city_name,
    tp.prefecture_name,
    tp.district_name,
    tp.year,
    ROUND(lp_city.avg_lp)        AS avg_published_price,
    ROUND(AVG(tp.price_per_sqm)) AS avg_transaction_price,
    ROUND(
        (AVG(tp.price_per_sqm) - lp_city.avg_lp)
        / NULLIF(lp_city.avg_lp, 0) * 100,
    2)                           AS divergence_rate,
    lp_city.published_count,
    COUNT(tp.id)                 AS transaction_count
FROM raw_transaction_prices tp
INNER JOIN (
    SELECT city_code, year,
           AVG(price_per_sqm) AS avg_lp,
           COUNT(id)          AS published_count
    FROM raw_land_prices
    WHERE price_per_sqm IS NOT NULL
    GROUP BY city_code, year
) lp_city
    ON lp_city.city_code = tp.city_code
   AND lp_city.year      = tp.year
WHERE tp.price_per_sqm IS NOT NULL
  AND tp.transaction_type IN ('宅地(土地)', '宅地(土地と建物)')
  AND tp.district_name IS NOT NULL
GROUP BY tp.city_code, tp.city_name, tp.prefecture_name, tp.district_name, tp.year,
         lp_city.avg_lp, lp_city.published_count
"""


def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text(_VIEW_SQL))
        conn.execute(text(_VIEW_TOWN_SQL))
        conn.commit()
