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
