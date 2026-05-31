import re

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.divergence import CityPriceDivergence, TownPriceDivergence

router = APIRouter()
_CITY_CODE_RE = re.compile(r"^[0-9]{5}$")
_PREF_CODE_RE = re.compile(r"^[0-9]{2}$")

_CITY_QUERY = """
SELECT lp.city_code, lp.city_name, lp.prefecture_name, lp.year,
       ROUND(AVG(lp.price_per_sqm))  AS avg_published_price,
       ROUND(AVG(tp.price_per_sqm))  AS avg_transaction_price,
       ROUND(
           (AVG(tp.price_per_sqm) - AVG(lp.price_per_sqm))
           / NULLIF(AVG(lp.price_per_sqm), 0) * 100,
       2)                             AS divergence_rate,
       COUNT(DISTINCT lp.id)          AS published_count,
       COUNT(DISTINCT tp.id)          AS transaction_count
FROM raw_land_prices lp
INNER JOIN raw_transaction_prices tp
    ON  lp.city_code = tp.city_code
    AND lp.year      = tp.year
    AND tp.transaction_type IN ('宅地(土地)', '宅地(土地と建物)')
    AND tp.price_per_sqm IS NOT NULL
WHERE lp.price_per_sqm IS NOT NULL
  AND (:prefecture_code IS NULL OR LEFT(lp.city_code, 2) = :prefecture_code)
  AND (:city_code       IS NULL OR lp.city_code         = :city_code)
  AND (:year_from       IS NULL OR lp.year              >= :year_from)
  AND (:year_to         IS NULL OR lp.year              <= :year_to)
  AND (:land_use        IS NULL OR lp.land_use          = :land_use)
GROUP BY lp.city_code, lp.city_name, lp.prefecture_name, lp.year
ORDER BY lp.city_code, lp.year
"""

_TOWN_QUERY = """
SELECT tp.city_code, tp.city_name, tp.prefecture_name, tp.district_name, tp.year,
       ROUND(lp_city.avg_lp)         AS avg_published_price,
       ROUND(AVG(tp.price_per_sqm))  AS avg_transaction_price,
       ROUND(
           (AVG(tp.price_per_sqm) - lp_city.avg_lp)
           / NULLIF(lp_city.avg_lp, 0) * 100,
       2)                             AS divergence_rate,
       lp_city.published_count,
       COUNT(tp.id)                   AS transaction_count
FROM raw_transaction_prices tp
INNER JOIN (
    SELECT city_code, year,
           AVG(price_per_sqm) AS avg_lp,
           COUNT(id)          AS published_count
    FROM raw_land_prices
    WHERE price_per_sqm IS NOT NULL
      AND (:land_use IS NULL OR land_use = :land_use)
    GROUP BY city_code, year
) lp_city
    ON lp_city.city_code = tp.city_code
   AND lp_city.year      = tp.year
WHERE tp.price_per_sqm IS NOT NULL
  AND tp.transaction_type IN ('宅地(土地)', '宅地(土地と建物)')
  AND tp.district_name IS NOT NULL
  AND (:prefecture_code IS NULL OR LEFT(tp.city_code, 2) = :prefecture_code)
  AND (:city_code       IS NULL OR tp.city_code          = :city_code)
  AND (:year_from       IS NULL OR tp.year               >= :year_from)
  AND (:year_to         IS NULL OR tp.year               <= :year_to)
GROUP BY tp.city_code, tp.city_name, tp.prefecture_name, tp.district_name, tp.year,
         lp_city.avg_lp, lp_city.published_count
ORDER BY tp.city_code, tp.district_name, tp.year
"""


@router.get("/cities", response_model=list[CityPriceDivergence])
def get_city_divergence(
    prefecture_code: str | None = Query(None),
    city_code: str | None = Query(None),
    year_from: int | None = Query(None),
    year_to: int | None = Query(None),
    land_use: str | None = Query(None),
    db: Session = Depends(get_db),
) -> list[CityPriceDivergence]:
    if city_code and not _CITY_CODE_RE.match(city_code):
        raise HTTPException(status_code=422, detail="city_code は5桁の数字で指定してください")
    rows = db.execute(
        text(_CITY_QUERY).bindparams(
            prefecture_code=prefecture_code,
            city_code=city_code,
            year_from=year_from,
            year_to=year_to,
            land_use=land_use,
        )
    ).fetchall()
    return [CityPriceDivergence(**dict(r._mapping)) for r in rows]


@router.get("/towns", response_model=list[TownPriceDivergence])
def get_town_divergence(
    prefecture_code: str | None = Query(None),
    city_code: str | None = Query(None),
    year_from: int | None = Query(None),
    year_to: int | None = Query(None),
    land_use: str | None = Query(None),
    db: Session = Depends(get_db),
) -> list[TownPriceDivergence]:
    if prefecture_code and not _PREF_CODE_RE.match(prefecture_code):
        raise HTTPException(status_code=422, detail="prefecture_code は2桁の数字で指定してください")
    if city_code and not _CITY_CODE_RE.match(city_code):
        raise HTTPException(status_code=422, detail="city_code は5桁の数字で指定してください")
    if not prefecture_code and not city_code:
        raise HTTPException(status_code=422, detail="prefecture_code または city_code を指定してください")
    rows = db.execute(
        text(_TOWN_QUERY).bindparams(
            prefecture_code=prefecture_code,
            city_code=city_code,
            year_from=year_from,
            year_to=year_to,
            land_use=land_use,
        )
    ).fetchall()
    return [TownPriceDivergence(**dict(r._mapping)) for r in rows]
