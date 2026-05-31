from pydantic import BaseModel


class CityPriceDivergence(BaseModel):
    city_code: str
    city_name: str
    prefecture_name: str
    year: int
    avg_published_price: int
    avg_transaction_price: int
    divergence_rate: float
    published_count: int
    transaction_count: int


class TownPriceDivergence(BaseModel):
    city_code: str
    city_name: str
    prefecture_name: str
    district_name: str
    year: int
    avg_published_price: int
    avg_transaction_price: int
    divergence_rate: float
    published_count: int
    transaction_count: int
