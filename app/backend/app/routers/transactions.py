import re

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, literal
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.transaction_price import RawTransactionPrice
from app.schemas.transaction_price import TransactionCityAnnualSummary

router = APIRouter()
_CITY_CODE_RE = re.compile(r"^[0-9]{5}$")


@router.get("/summary/cities", response_model=list[TransactionCityAnnualSummary])
def get_city_summary(
    prefecture_code: str | None = Query(None),
    city_code: str | None = Query(None),
    year_from: int | None = Query(None),
    year_to: int | None = Query(None),
    transaction_type: str | None = Query(None),
    aggregate_by: str = Query("annual"),
    db: Session = Depends(get_db),
) -> list[TransactionCityAnnualSummary]:
    if city_code and not _CITY_CODE_RE.match(city_code):
        raise HTTPException(status_code=422, detail="city_code は5桁の数字で指定してください")

    quarterly = aggregate_by == "quarterly"
    quarter_col = RawTransactionPrice.quarter if quarterly else literal(None)

    q = db.query(
        RawTransactionPrice.city_code,
        RawTransactionPrice.city_name,
        RawTransactionPrice.prefecture_name,
        RawTransactionPrice.year,
        quarter_col.label("quarter"),
        func.avg(RawTransactionPrice.price_per_sqm).label("avg_price_per_sqm"),
        func.min(RawTransactionPrice.price_per_sqm).label("min_price_per_sqm"),
        func.max(RawTransactionPrice.price_per_sqm).label("max_price_per_sqm"),
        func.avg(RawTransactionPrice.trade_price).label("avg_trade_price"),
        func.count().label("record_count"),
    ).filter(RawTransactionPrice.price_per_sqm.isnot(None))

    if prefecture_code:
        q = q.filter(RawTransactionPrice.city_code.like(f"{prefecture_code}%"))
    if city_code:
        q = q.filter(RawTransactionPrice.city_code == city_code)
    if year_from is not None:
        q = q.filter(RawTransactionPrice.year >= year_from)
    if year_to is not None:
        q = q.filter(RawTransactionPrice.year <= year_to)
    if transaction_type:
        q = q.filter(RawTransactionPrice.transaction_type == transaction_type)

    group_by = [
        RawTransactionPrice.city_code,
        RawTransactionPrice.city_name,
        RawTransactionPrice.prefecture_name,
        RawTransactionPrice.year,
    ]
    if quarterly:
        group_by.append(RawTransactionPrice.quarter)

    rows = q.group_by(*group_by).order_by(RawTransactionPrice.city_code, RawTransactionPrice.year).all()

    return [
        TransactionCityAnnualSummary(
            city_code=r.city_code,
            city_name=r.city_name,
            prefecture_name=r.prefecture_name,
            year=r.year,
            quarter=r.quarter,
            avg_price_per_sqm=float(r.avg_price_per_sqm or 0),
            min_price_per_sqm=int(r.min_price_per_sqm or 0),
            max_price_per_sqm=int(r.max_price_per_sqm or 0),
            avg_trade_price=float(r.avg_trade_price or 0),
            record_count=r.record_count,
        )
        for r in rows
    ]
