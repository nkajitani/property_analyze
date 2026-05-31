"""
BE-DIV-01〜07: GET /api/v1/divergence/cities
NOTE: SQLite では LEFT() 関数が使用できないため、テスト用に SUBSTR() に置換したクエリを使用。
      divergence ルーターのクエリを monkeypatch でパッチする。
"""
import pytest
from unittest.mock import patch

from app.models.land_price import RawLandPrice
from app.models.transaction_price import RawTransactionPrice

# SQLite 用の VIEW クエリ（LEFT() → SUBSTR()）
_SQLITE_VIEW_QUERY = """
SELECT city_code, city_name, prefecture_name, year,
       avg_published_price, avg_transaction_price, divergence_rate,
       published_count, transaction_count
FROM v_price_divergence
WHERE (:prefecture_code IS NULL OR SUBSTR(city_code, 1, 2) = :prefecture_code)
  AND (:city_code IS NULL OR city_code = :city_code)
  AND (:year_from IS NULL OR year >= :year_from)
  AND (:year_to IS NULL OR year <= :year_to)
ORDER BY city_code, year
"""


def _add_land_price(db, city_code="13101", city_name="千代田区", year=2024, price=1000000, address="addr1"):
    lp = RawLandPrice(
        prefecture_code=city_code[:2],
        prefecture_name="東京都",
        city_code=city_code,
        city_name=city_name,
        price_per_sqm=price,
        year=year,
        address=address,
    )
    db.add(lp)


def _add_transaction(db, city_code="13101", city_name="千代田区", year=2024, price=1250000, q=1):
    tx = RawTransactionPrice(
        city_code=city_code,
        prefecture_name="東京都",
        city_name=city_name,
        price_per_sqm=price,
        trade_price=price * 100,
        year=year,
        quarter=q,
        transaction_type="宅地(土地)",
        trade_period=f"{year}年第{q}四半期",
    )
    db.add(tx)


import app.routers.divergence as divergence_module


class TestDivergence:
    def _patch_query(self):
        """SQLite では LEFT() が使えないため SUBSTR() に置換したクエリを使用"""
        return patch.object(divergence_module, "_VIEW_QUERY", _SQLITE_VIEW_QUERY)

    def test_be_div_01_empty(self, client):
        """データなし → 空配列"""
        with self._patch_query():
            resp = client.get("/api/v1/divergence/cities")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_be_div_02_normal(self, client, db_session):
        """データあり → CityPriceDivergence 配列"""
        _add_land_price(db_session)
        _add_transaction(db_session)
        db_session.commit()
        with self._patch_query():
            resp = client.get("/api/v1/divergence/cities")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert "divergence_rate" in data[0]

    def test_be_div_03_divergence_rate(self, client, db_session):
        """乖離率の計算: 公示=100万, 取引=125万 → 25.00%"""
        _add_land_price(db_session, price=1000000)
        _add_transaction(db_session, price=1250000)
        db_session.commit()
        with self._patch_query():
            resp = client.get("/api/v1/divergence/cities")
        data = resp.json()
        assert len(data) >= 1
        assert data[0]["divergence_rate"] == pytest.approx(25.0, abs=0.1)

    def test_be_div_04_prefecture_filter(self, client, db_session):
        """prefecture_code フィルタ"""
        _add_land_price(db_session, city_code="13101", city_name="千代田区", address="addr1")
        _add_transaction(db_session, city_code="13101", city_name="千代田区", q=1)
        _add_land_price(db_session, city_code="14101", city_name="横浜市", address="addr2")
        _add_transaction(db_session, city_code="14101", city_name="横浜市", q=2)
        db_session.commit()
        with self._patch_query():
            resp = client.get("/api/v1/divergence/cities?prefecture_code=13")
        data = resp.json()
        assert all(r["city_code"].startswith("13") for r in data)

    def test_be_div_05_city_code_filter(self, client, db_session):
        """city_code フィルタ"""
        _add_land_price(db_session, city_code="13101", address="addr1")
        _add_transaction(db_session, city_code="13101", q=1)
        _add_land_price(db_session, city_code="13102", city_name="中央区", address="addr2")
        _add_transaction(db_session, city_code="13102", city_name="中央区", q=2)
        db_session.commit()
        with self._patch_query():
            resp = client.get("/api/v1/divergence/cities?city_code=13101")
        data = resp.json()
        assert all(r["city_code"] == "13101" for r in data)

    def test_be_div_06_year_filter(self, client, db_session):
        """year_from / year_to フィルタ"""
        for year in [2022, 2023, 2024]:
            _add_land_price(db_session, year=year, address=f"addr{year}")
            _add_transaction(db_session, year=year, q=1)
        db_session.commit()
        with self._patch_query():
            resp = client.get("/api/v1/divergence/cities?year_from=2022&year_to=2023")
        data = resp.json()
        years = {r["year"] for r in data}
        assert years <= {2022, 2023}

    def test_be_div_07_sqli_protection(self, client):
        """SQLi 対策: 不正 city_code → HTTP 422（BUG-003 修正後）"""
        resp = client.get("/api/v1/divergence/cities?city_code='; DROP TABLE raw_land_prices--")
        # BUG-003 修正後は 422 を返す
        assert resp.status_code == 422
