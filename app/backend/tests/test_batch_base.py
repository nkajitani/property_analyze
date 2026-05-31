"""
BE-PARSE-01〜13: batch/base.py のパース処理
BE-UPSERT-01〜03: upsert_records
"""
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

from app.batch.base import parse_land_price_feature, parse_transaction_feature, upsert_records


# ---------------------------------------------------------------------------
# ヘルパー
# ---------------------------------------------------------------------------

def _land_feature(overrides=None):
    base = {
        "type": "Feature",
        "properties": {
            "city_code": "13101",
            "prefecture_code": "13",
            "prefecture_name_ja": "東京都",
            "ward_town_village_name_ja": "千代田区",
            "u_current_years_price_ja": "1,000,000",
            "residence_display_name_ja": "千代田1-1",
        },
        "geometry": {
            "type": "Point",
            "coordinates": [139.7671, 35.6812],
        },
    }
    if overrides:
        for k, v in overrides.items():
            if k == "properties":
                base["properties"].update(v)
            else:
                base[k] = v
    return base


def _tx_feature(overrides=None):
    base = {
        "type": "Feature",
        "properties": {
            "CityCode": "13101",
            "Prefecture": "東京都",
            "Municipality": "千代田区",
            "TradePeriod": "2024年第1四半期",
            "UnitPrice": "100000",
            "TradePrice": "50000000",
            "Latitude": "35.68",
            "Longitude": "139.76",
        },
        "geometry": None,
    }
    if overrides:
        for k, v in overrides.items():
            if k == "properties":
                base["properties"].update(v)
            else:
                base[k] = v
    return base


# ---------------------------------------------------------------------------
# parse_land_price_feature
# ---------------------------------------------------------------------------

class TestParseLandPriceFeature:
    _PREF_CODES = ["13", "14", "11", "12"]

    def test_be_parse_01_normal(self):
        """正常なフィーチャー → dict を返す"""
        result = parse_land_price_feature(_land_feature(), self._PREF_CODES, 2024)
        assert isinstance(result, dict)
        assert result["city_code"] == "13101"

    def test_be_parse_02_no_properties(self):
        """properties キーなし → None"""
        result = parse_land_price_feature({}, self._PREF_CODES, 2024)
        assert result is None

    def test_be_parse_03_null_price(self):
        """price が null → None"""
        feat = _land_feature({"properties": {"u_current_years_price_ja": None}})
        result = parse_land_price_feature(feat, self._PREF_CODES, 2024)
        assert result is None

    def test_be_parse_04_string_price(self):
        """price が 'abc' → None"""
        feat = _land_feature({"properties": {"u_current_years_price_ja": "abc"}})
        result = parse_land_price_feature(feat, self._PREF_CODES, 2024)
        assert result is None

    def test_be_parse_05_lat_out_of_range(self):
        """緯度範囲外 (>90) → latitude=None だが dict は返る"""
        feat = _land_feature()
        feat["geometry"] = {"type": "Point", "coordinates": [139.7671, 91.0]}
        result = parse_land_price_feature(feat, self._PREF_CODES, 2024)
        # 座標が無効なため lat/lon は None になるが dict は返る
        assert result is not None
        assert result["latitude"] is None

    def test_be_parse_06_lon_out_of_range(self):
        """経度範囲外 (<-180) → longitude=None"""
        feat = _land_feature()
        feat["geometry"] = {"type": "Point", "coordinates": [-181.0, 35.68]}
        result = parse_land_price_feature(feat, self._PREF_CODES, 2024)
        assert result is not None
        assert result["longitude"] is None

    def test_be_parse_07_lat_boundary(self):
        """緯度 = 90.0（境界値） → 通過"""
        feat = _land_feature()
        feat["geometry"] = {"type": "Point", "coordinates": [139.7671, 90.0]}
        result = parse_land_price_feature(feat, self._PREF_CODES, 2024)
        assert result is not None

    def test_be_parse_11_extra_fields_ignored(self):
        """想定外フィールド → 無視されて正常パース"""
        feat = _land_feature({"properties": {"extra_field": "xxx"}})
        result = parse_land_price_feature(feat, self._PREF_CODES, 2024)
        assert result is not None

    def test_be_parse_12_out_of_scope_city(self):
        """対象外 city_code → None"""
        feat = _land_feature({"properties": {"city_code": "01101"}})
        result = parse_land_price_feature(feat, self._PREF_CODES, 2024)
        assert result is None

    def test_be_parse_13_in_scope_city(self):
        """対象内 city_code → dict を返す"""
        feat = _land_feature({"properties": {"city_code": "13101"}})
        result = parse_land_price_feature(feat, self._PREF_CODES, 2024)
        assert result is not None


# ---------------------------------------------------------------------------
# parse_transaction_feature (trade_period テスト含む)
# ---------------------------------------------------------------------------

class TestParseTransactionFeature:
    _PREF_CODES = ["13", "14", "11", "12"]

    def test_be_parse_08_trade_period_ok(self):
        """正常な trade_period"""
        feat = _tx_feature({"properties": {"TradePeriod": "2024年第3四半期"}})
        result = parse_transaction_feature(feat, self._PREF_CODES)
        assert result is not None
        assert result["year"] == 2024
        assert result["quarter"] == 3

    def test_be_parse_09_trade_period_invalid(self):
        """不正な trade_period '2024年' → None"""
        feat = _tx_feature({"properties": {"TradePeriod": "2024年"}})
        result = parse_transaction_feature(feat, self._PREF_CODES)
        assert result is None

    def test_be_parse_10_trade_period_empty(self):
        """trade_period 空文字 → None"""
        feat = _tx_feature({"properties": {"TradePeriod": ""}})
        result = parse_transaction_feature(feat, self._PREF_CODES)
        assert result is None


# ---------------------------------------------------------------------------
# upsert_records
# NOTE: upsert_records は sqlalchemy.dialects.postgresql.insert を使用しているため
#       PostgreSQL 環境でのみ動作する。SQLite インメモリ DB では実行不可。
#       以下のテストは PostgreSQL 接続時にのみ実行する。
# ---------------------------------------------------------------------------

import pytest

class TestUpsertRecords:
    def test_be_upsert_01_empty(self, db_session):
        """空リスト → 0（PostgreSQL 方言不要のためテスト可能）"""
        from app.models.land_price import RawLandPrice
        result = upsert_records(db_session, RawLandPrice, [], "uq_land_price_entry")
        assert result == 0

    @pytest.mark.skip(reason="upsert_records は PostgreSQL 方言を使用するため SQLite では実行不可")
    def test_be_upsert_02_insert(self, db_session):
        """新規 INSERT → 1（PostgreSQL 環境でのみ実行）"""
        from app.models.land_price import RawLandPrice
        records = [{
            "prefecture_code": "13",
            "prefecture_name": "東京都",
            "city_code": "13101",
            "city_name": "千代田区",
            "price_per_sqm": 500000,
            "year": 2024,
            "address": "upsert-test-1",
        }]
        result = upsert_records(
            db_session, RawLandPrice, records, "uq_land_price_entry",
            dedup_keys=["city_code", "year", "address"]
        )
        assert result == 1

    @pytest.mark.skip(reason="upsert_records は PostgreSQL 方言を使用するため SQLite では実行不可")
    def test_be_upsert_03_idempotent(self, db_session):
        """重複 upsert → エラーなし（PostgreSQL 環境でのみ実行）"""
        from app.models.land_price import RawLandPrice
        records = [{
            "prefecture_code": "13",
            "prefecture_name": "東京都",
            "city_code": "13101",
            "city_name": "千代田区",
            "price_per_sqm": 500000,
            "year": 2024,
            "address": "upsert-idem-test",
        }]
        upsert_records(db_session, RawLandPrice, records, "uq_land_price_entry",
                       dedup_keys=["city_code", "year", "address"])
        upsert_records(db_session, RawLandPrice, records, "uq_land_price_entry",
                       dedup_keys=["city_code", "year", "address"])
        count = db_session.query(RawLandPrice).filter_by(address="upsert-idem-test").count()
        assert count == 1
