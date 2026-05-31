from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.land_price import RawLandPrice
from app.schemas.land_price import CityAnnualSummary, DistrictAnnualSummary, LandPriceCreate, LandPriceRead

router = APIRouter()


@router.get("/", response_model=list[LandPriceRead])
def list_land_prices(
    prefecture_code: str | None = Query(None),
    city_code: str | None = Query(None),
    year: int | None = Query(None),
    limit: int = Query(100, le=1000),
    offset: int = Query(0),
    db: Session = Depends(get_db),
) -> list[RawLandPrice]:
    q = db.query(RawLandPrice)
    if prefecture_code:
        q = q.filter(RawLandPrice.prefecture_code == prefecture_code)
    if city_code:
        q = q.filter(RawLandPrice.city_code == city_code)
    if year:
        q = q.filter(RawLandPrice.year == year)
    return q.offset(offset).limit(limit).all()


@router.post("/", response_model=LandPriceRead, status_code=201)
def create_land_price(
    payload: LandPriceCreate,
    db: Session = Depends(get_db),
) -> RawLandPrice:
    record = RawLandPrice(**payload.model_dump())
    db.add(record)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="同じ地点・年度のデータが既に存在します。")
    db.refresh(record)
    return record


@router.get("/land-uses", response_model=list[str])
def list_land_uses(db: Session = Depends(get_db)) -> list[str]:
    rows = (
        db.query(RawLandPrice.land_use)
        .filter(RawLandPrice.land_use.isnot(None))
        .distinct()
        .order_by(RawLandPrice.land_use)
        .all()
    )
    return [r.land_use for r in rows]


@router.get("/summary/cities", response_model=list[CityAnnualSummary])
def city_annual_summary(
    prefecture_code: str | None = Query(None),
    land_use: str | None = Query(None),
    db: Session = Depends(get_db),
) -> list[CityAnnualSummary]:
    q = db.query(
        RawLandPrice.city_code,
        RawLandPrice.city_name,
        RawLandPrice.prefecture_name,
        RawLandPrice.year,
        func.avg(RawLandPrice.price_per_sqm).label("avg_price_per_sqm"),
        func.min(RawLandPrice.price_per_sqm).label("min_price_per_sqm"),
        func.max(RawLandPrice.price_per_sqm).label("max_price_per_sqm"),
        func.count(RawLandPrice.id).label("record_count"),
    ).group_by(
        RawLandPrice.city_code,
        RawLandPrice.city_name,
        RawLandPrice.prefecture_name,
        RawLandPrice.year,
    )
    if prefecture_code:
        q = q.filter(RawLandPrice.prefecture_code == prefecture_code)
    if land_use:
        q = q.filter(RawLandPrice.land_use == land_use)
    rows = q.order_by(RawLandPrice.city_code, RawLandPrice.year).all()
    return [
        CityAnnualSummary(
            city_code=r.city_code,
            city_name=r.city_name,
            prefecture_name=r.prefecture_name,
            year=r.year,
            avg_price_per_sqm=float(r.avg_price_per_sqm),
            min_price_per_sqm=r.min_price_per_sqm,
            max_price_per_sqm=r.max_price_per_sqm,
            record_count=r.record_count,
        )
        for r in rows
    ]


_DISTRICT_QUERY = """
SELECT
    city_code,
    city_name,
    TRIM(regexp_replace(district_name,
        '[一二三四五六七八九十百〇0-9０-９]+丁目.*$', '')) AS district_name,
    year,
    ROUND(AVG(price_per_sqm)::numeric, 0) AS avg_price_per_sqm,
    MIN(price_per_sqm)                     AS min_price_per_sqm,
    MAX(price_per_sqm)                     AS max_price_per_sqm,
    COUNT(id)                              AS record_count
FROM raw_land_prices
WHERE city_code = :city_code
  AND district_name IS NOT NULL
  AND district_name != ''
GROUP BY
    city_code, city_name,
    TRIM(regexp_replace(district_name,
        '[一二三四五六七八九十百〇0-9０-９]+丁目.*$', '')),
    year
ORDER BY district_name, year
"""


@router.get("/summary/districts", response_model=list[DistrictAnnualSummary])
def district_annual_summary(
    city_code: str = Query(...),
    db: Session = Depends(get_db),
) -> list[DistrictAnnualSummary]:
    rows = db.execute(
        text(_DISTRICT_QUERY).bindparams(city_code=city_code)
    ).fetchall()
    return [
        DistrictAnnualSummary(
            city_code=r.city_code,
            city_name=r.city_name,
            district_name=r.district_name,
            year=r.year,
            avg_price_per_sqm=float(r.avg_price_per_sqm),
            min_price_per_sqm=r.min_price_per_sqm,
            max_price_per_sqm=r.max_price_per_sqm,
            record_count=r.record_count,
        )
        for r in rows
    ]
