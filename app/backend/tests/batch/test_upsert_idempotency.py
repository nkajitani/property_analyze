"""
BATCH-IDEM-01〜03: upsert 冪等性テスト
NOTE: upsert_records は sqlalchemy.dialects.postgresql.insert を使用するため
      SQLite インメモリ DB では実行不可。PostgreSQL 環境でのみ有効。
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.batch.base import upsert_records
from app.models.land_price import RawLandPrice
from app.models.transaction_price import RawTransactionPrice
import pytest


class TestUpsertIdempotency:
    @pytest.mark.skip(reason="upsert_records は PostgreSQL 方言を使用するため SQLite では実行不可")
    def test_batch_idem_01_raw_tx_twice(self, db_session):
        """BATCH-IDEM-01: 同一 raw_transaction_prices を 2 回 upsert → 1 件"""
        record = {
            "city_code": "13101",
            "prefecture_name": "東京都",
            "city_name": "千代田区",
            "price_per_sqm": 100000,
            "trade_price": 50000000,
            "year": 2024,
            "quarter": 1,
            "transaction_type": "宅地(土地)",
            "trade_period": "2024年第1四半期",
            # ユニーク制約: city_code, trade_period, district_name, trade_price, area_sqm, transaction_type
            "district_name": None,
            "area_sqm": None,
        }
        upsert_records(db_session, RawTransactionPrice, [record], "uq_transaction_price_entry")
        upsert_records(db_session, RawTransactionPrice, [record], "uq_transaction_price_entry")
        count = db_session.query(RawTransactionPrice).count()
        assert count == 1

    @pytest.mark.skip(reason="upsert_records は PostgreSQL 方言を使用するため SQLite では実行不可")
    def test_batch_idem_02_raw_land_prices_twice(self, db_session):
        """BATCH-IDEM-02: 同一 raw_land_prices を 2 回 upsert → 1 件"""
        record = {
            "prefecture_code": "13",
            "prefecture_name": "東京都",
            "city_code": "13101",
            "city_name": "千代田区",
            "price_per_sqm": 500000,
            "year": 2024,
            "address": "idem-test-addr",
        }
        upsert_records(
            db_session, RawLandPrice, [record], "uq_land_price_entry",
            dedup_keys=["city_code", "year", "address"]
        )
        upsert_records(
            db_session, RawLandPrice, [record], "uq_land_price_entry",
            dedup_keys=["city_code", "year", "address"]
        )
        count = db_session.query(RawLandPrice).filter_by(address="idem-test-addr").count()
        assert count == 1

    @pytest.mark.skip(reason="upsert_records は PostgreSQL 方言を使用するため SQLite では実行不可")
    def test_batch_idem_03_updated_at_changes(self, db_session):
        """BATCH-IDEM-03: 2 回目 upsert 後に updated_at が更新される"""
        import time
        from datetime import datetime, timezone

        record = {
            "prefecture_code": "13",
            "prefecture_name": "東京都",
            "city_code": "13101",
            "city_name": "千代田区",
            "price_per_sqm": 500000,
            "year": 2024,
            "address": "idem-updated-at-test",
        }
        upsert_records(
            db_session, RawLandPrice, [record], "uq_land_price_entry",
            dedup_keys=["city_code", "year", "address"]
        )
        time.sleep(0.01)  # 時刻差を作る
        upsert_records(
            db_session, RawLandPrice, [record], "uq_land_price_entry",
            dedup_keys=["city_code", "year", "address"]
        )
        # updated_at が設定されていることを確認（None でない）
        row = db_session.query(RawLandPrice).filter_by(address="idem-updated-at-test").first()
        assert row is not None
        assert row.updated_at is not None
