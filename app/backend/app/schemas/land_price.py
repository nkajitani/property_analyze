from pydantic import BaseModel


class LandPriceBase(BaseModel):
    prefecture_code: str
    prefecture_name: str
    city_code: str
    city_name: str
    district_name: str | None = None
    land_use: str | None = None
    price_per_sqm: int
    area_sqm: float | None = None
    year: int
    address: str | None = None
    station_name: str | None = None
    distance_to_station: int | None = None
    latitude: float | None = None
    longitude: float | None = None


class LandPriceCreate(LandPriceBase):
    pass


class LandPriceRead(LandPriceBase):
    id: int

    model_config = {"from_attributes": True}


class CityAnnualSummary(BaseModel):
    city_code: str
    city_name: str
    prefecture_name: str
    year: int
    avg_price_per_sqm: float
    min_price_per_sqm: int
    max_price_per_sqm: int
    record_count: int


class DistrictAnnualSummary(BaseModel):
    city_code: str
    city_name: str
    district_name: str
    year: int
    avg_price_per_sqm: float
    min_price_per_sqm: int
    max_price_per_sqm: int
    record_count: int
