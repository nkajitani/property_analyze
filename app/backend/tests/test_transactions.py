"""
BE-TX-SUM-01〜09: GET /api/v1/transactions/summary/cities
"""
from app.models.transaction_price import RawTransactionPrice


def _make_tx(**kwargs):
    defaults = dict(
        city_code="13101",
        prefecture_name="東京都",
        city_name="千代田区",
        price_per_sqm=100000,
        trade_price=50000000,
        year=2024,
        quarter=1,
        transaction_type="宅地(土地)",
        trade_period="2024年第1四半期",
    )
    defaults.update(kwargs)
    return RawTransactionPrice(**defaults)


class TestTransactionsSummary:
    def test_be_tx_sum_01_empty(self, client):
        """データなし → 空配列"""
        resp = client.get("/api/v1/transactions/summary/cities")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_be_tx_sum_02_annual(self, client, db_session):
        """annual 集計 → quarter=null"""
        for q in [1, 2, 3, 4]:
            db_session.add(_make_tx(quarter=q, trade_period=f"2024年第{q}四半期"))
        db_session.commit()
        resp = client.get("/api/v1/transactions/summary/cities?aggregate_by=annual")
        data = resp.json()
        assert len(data) >= 1
        assert data[0]["quarter"] is None

    def test_be_tx_sum_03_quarterly(self, client, db_session):
        """quarterly 集計 → quarter が各行に設定"""
        for q in [1, 2]:
            db_session.add(_make_tx(quarter=q, trade_period=f"2024年第{q}四半期"))
        db_session.commit()
        resp = client.get("/api/v1/transactions/summary/cities?aggregate_by=quarterly")
        data = resp.json()
        assert all(r["quarter"] is not None for r in data)

    def test_be_tx_sum_04_city_code_valid(self, client):
        """city_code 5 桁 → HTTP 200"""
        resp = client.get("/api/v1/transactions/summary/cities?city_code=13101")
        assert resp.status_code == 200

    def test_be_tx_sum_05_city_code_4digits(self, client):
        """city_code 4 桁 → HTTP 422"""
        resp = client.get("/api/v1/transactions/summary/cities?city_code=1310")
        assert resp.status_code == 422

    def test_be_tx_sum_06_city_code_alpha(self, client):
        """city_code 英字混入 → HTTP 422"""
        resp = client.get("/api/v1/transactions/summary/cities?city_code=1310A")
        assert resp.status_code == 422

    def test_be_tx_sum_07_prefecture_filter(self, client, db_session):
        """prefecture_code フィルタ → 神奈川のみ"""
        db_session.add(_make_tx(city_code="13101", trade_period="2024年第1四半期"))
        db_session.add(_make_tx(city_code="14101", city_name="横浜市", trade_period="2024年第2四半期"))
        db_session.commit()
        resp = client.get("/api/v1/transactions/summary/cities?prefecture_code=14")
        data = resp.json()
        assert all(r["city_code"].startswith("14") for r in data)

    def test_be_tx_sum_08_year_from_to(self, client, db_session):
        """year_from / year_to フィルタ"""
        db_session.add(_make_tx(year=2021, trade_period="2021年第1四半期"))
        db_session.add(_make_tx(year=2022, trade_period="2022年第1四半期"))
        db_session.add(_make_tx(year=2023, trade_period="2023年第1四半期"))
        db_session.add(_make_tx(year=2024, trade_period="2024年第1四半期"))
        db_session.commit()
        resp = client.get("/api/v1/transactions/summary/cities?year_from=2022&year_to=2023")
        data = resp.json()
        years = {r["year"] for r in data}
        assert years == {2022, 2023}

    def test_be_tx_sum_09_aggregation(self, client, db_session):
        """集計値の正確性: avg=150000"""
        import pytest
        db_session.add(_make_tx(price_per_sqm=100000, trade_period="2024年第1四半期"))
        db_session.add(_make_tx(price_per_sqm=200000, trade_period="2024年第2四半期"))
        db_session.commit()
        resp = client.get("/api/v1/transactions/summary/cities")
        data = resp.json()
        assert data[0]["avg_price_per_sqm"] == pytest.approx(150000.0, rel=1e-3)
        assert data[0]["min_price_per_sqm"] == 100000
        assert data[0]["max_price_per_sqm"] == 200000
