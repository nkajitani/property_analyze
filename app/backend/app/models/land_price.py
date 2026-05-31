from sqlalchemy import BigInteger, Column, DateTime, Float, Integer, String, UniqueConstraint, func

from app.database import Base


class RawLandPrice(Base):
    __tablename__ = "raw_land_prices"

    id                  = Column(Integer, primary_key=True, index=True)
    prefecture_code     = Column(String(2), nullable=False, index=True)
    prefecture_name     = Column(String(10), nullable=False)
    city_code           = Column(String(5), nullable=False, index=True)
    city_name           = Column(String(50), nullable=False)
    district_name       = Column(String(100))
    land_use            = Column(String(20))
    price_per_sqm       = Column(BigInteger, nullable=False)
    area_sqm            = Column(Float)
    year                = Column(Integer, nullable=False, index=True)
    address             = Column(String(200))
    station_name        = Column(String(50))
    distance_to_station = Column(Integer)
    latitude            = Column(Float)
    longitude           = Column(Float)
    created_at          = Column(DateTime, server_default=func.now())
    updated_at          = Column(DateTime)

    __table_args__ = (
        UniqueConstraint(
            "city_code", "year", "address",
            name="uq_land_price_entry",
            postgresql_nulls_not_distinct=True,
        ),
    )
