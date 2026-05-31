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
