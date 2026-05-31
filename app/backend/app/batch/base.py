import logging
import re
from datetime import datetime, timezone

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.batch.city_code_map import CITY_CODE_MAP

logger = logging.getLogger(__name__)
_TRADE_PERIOD_RE = re.compile(r"(\d{4})年第([1-4])四半期")
_DIGITS_RE = re.compile(r"[\d.]+")


def _safe_int(val: object) -> int | None:
    try:
        return int(val) if val not in (None, "") else None  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


def _safe_float(val: object) -> float | None:
    try:
        return float(val) if val not in (None, "") else None  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


def _parse_ja_number(val: object) -> int | None:
    """"758,000(円/㎡)" や "60(%)" などから先頭の数値を整数で返す"""
    if val is None:
        return None
    s = str(val).replace(",", "").replace("，", "")
    m = _DIGITS_RE.search(s)
    return int(float(m.group())) if m else None


def _parse_ja_float(val: object) -> float | None:
    """"169(㎡)" などから先頭の数値を float で返す"""
    if val is None:
        return None
    s = str(val).replace(",", "")
    m = _DIGITS_RE.search(s)
    return float(m.group()) if m else None


def _coords_from_geometry(feature: dict) -> tuple[float | None, float | None]:
    """GeoJSON Feature の geometry から (lat, lon) を返す"""
    geom = feature.get("geometry") or {}
    if geom.get("type") == "Point":
        coords = geom.get("coordinates", [])
        if len(coords) >= 2:
            lon, lat = float(coords[0]), float(coords[1])
            if -90 <= lat <= 90 and -180 <= lon <= 180:
                return lat, lon
    return None, None


def parse_land_price_feature(feature: dict, target_pref_codes: list[str], year: int) -> dict | None:
    """XPT002 レスポンスの Feature を DB 挿入用 dict に変換する"""
    try:
        props = feature["properties"]
    except KeyError:
        return None

    city_code = str(props.get("city_code") or "")
    if not city_code or not any(city_code.startswith(p) for p in target_pref_codes):
        return None

    price = _parse_ja_number(props.get("u_current_years_price_ja"))
    if price is None:
        return None

    lat, lon = _coords_from_geometry(feature)

    dist_raw = props.get("u_road_distance_to_nearest_station_name_ja") or ""
    dist_m = _safe_int(re.sub(r"[^\d]", "", str(dist_raw))) if dist_raw else None

    city_code_5 = city_code[:5]
    city_name = (
        str(props.get("ward_town_village_name_ja") or "")
        or CITY_CODE_MAP.get(city_code_5, "")
    )

    return {
        "prefecture_code":     str(props.get("prefecture_code") or city_code[:2]),
        "prefecture_name":     str(props.get("prefecture_name_ja") or ""),
        "city_code":           city_code_5,
        "city_name":           city_name,
        "district_name":       props.get("location_number_ja"),
        "land_use":            props.get("use_category_name_ja"),
        "price_per_sqm":       price,
        "area_sqm":            _parse_ja_float(props.get("u_cadastral_ja")),
        "year":                year,
        "address":             props.get("residence_display_name_ja") or props.get("location"),
        "station_name":        props.get("nearest_station_name_ja"),
        "distance_to_station": dist_m,
        "latitude":            lat,
        "longitude":           lon,
    }


def parse_transaction_feature(item: dict, target_pref_codes: list[str]) -> dict | None:
    """XIT001 レスポンスの1レコード（フラット dict）を DB 挿入用 dict に変換する"""
    city_code = str(item.get("MunicipalityCode") or "")
    if not city_code or not any(city_code.startswith(p) for p in target_pref_codes):
        return None

    period = str(item.get("Period") or "")
    m = _TRADE_PERIOD_RE.search(period)
    if not m:
        return None
    year, quarter = int(m.group(1)), int(m.group(2))

    trade_price = _safe_int(item.get("TradePrice"))
    area = _safe_float(item.get("Area"))

    # UnitPrice / PricePerUnit は空の場合があるため TradePrice / Area で算出
    price_per_sqm = _safe_int(item.get("UnitPrice")) or _safe_int(item.get("PricePerUnit"))
    if price_per_sqm is None and trade_price and area and area > 0:
        price_per_sqm = round(trade_price / area)

    # "1969年" → 1969
    by_raw = str(item.get("BuildingYear") or "")
    by_m = re.search(r"(\d{4})", by_raw)
    building_year = int(by_m.group(1)) if by_m else None

    return {
        "city_code":           city_code[:5],
        "prefecture_name":     str(item.get("Prefecture") or ""),
        "city_name":           str(item.get("Municipality") or ""),
        "district_name":       item.get("DistrictName") or None,
        "transaction_type":    item.get("Type") or None,
        "region":              item.get("Region") or None,
        "trade_price":         trade_price,
        "price_per_sqm":       price_per_sqm,
        "price_per_tsubo":     _safe_int(item.get("PricePerUnit")) or None,
        "area_sqm":            area,
        "land_shape":          item.get("LandShape") or None,
        "frontage":            _safe_float(item.get("Frontage")),
        "total_floor_area":    _safe_float(item.get("TotalFloorArea")),
        "building_year":       building_year,
        "structure":           item.get("Structure") or None,
        "current_use":         item.get("Use") or None,
        "future_use":          item.get("Purpose") or None,
        "city_planning":       item.get("CityPlanning") or None,
        "coverage_ratio":      _safe_int(item.get("CoverageRatio")),
        "floor_area_ratio":    _safe_int(item.get("FloorAreaRatio")),
        "road_direction":      item.get("Direction") or None,
        "road_classification": item.get("Classification") or None,
        "road_breadth":        _safe_float(item.get("Breadth")),
        "trade_period":        period[:10],
        "floor_plan":          item.get("FloorPlan") or None,
        "renovation":          item.get("Renovation") or None,
        "remarks":             item.get("Remarks") or None,
        "latitude":            None,
        "longitude":           None,
        "year":                year,
        "quarter":             quarter,
    }


def upsert_records(
    db: Session,
    model_cls: type,
    records: list[dict],
    constraint: str,
    dedup_keys: list[str] | None = None,
) -> int:
    if not records:
        return 0
    # 同一バッチ内の重複を除去（CardinalityViolation 防止）
    if dedup_keys:
        seen: dict[tuple, dict] = {}
        for r in records:
            key = tuple(r.get(k) for k in dedup_keys)
            seen[key] = r
        records = list(seen.values())
    if not records:
        return 0
    stmt = insert(model_cls).values(records)
    stmt = stmt.on_conflict_do_update(
        constraint=constraint,
        set_={"updated_at": datetime.now(timezone.utc)},
    )
    db.execute(stmt)
    db.commit()
    return len(records)
