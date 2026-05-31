"""
BE-LP-LIST-01〜08: GET /api/v1/land-prices/
BE-LP-POST-01〜04: POST /api/v1/land-prices/
BE-LP-SUM-01〜04:  GET /api/v1/land-prices/summary/cities
"""
import pytest

from app.models.land_price import RawLandPrice


def _make_record(**kwargs):
    defaults = dict(
        prefecture_code="13",
        prefecture_name="東京都",
        city_code="13101",
        city_name="千代田区",
        price_per_sqm=500000,
        year=2023,
        address="千代田1-1",
    )
    defaults.update(kwargs)
    return RawLandPrice(**defaults)


# ---------------------------------------------------------------------------
# GET /api/v1/land-prices/ — リスト取得
# ---------------------------------------------------------------------------

class TestListLandPrices:
    def test_be_lp_list_01_empty(self, client):
        """データなし時は空配列"""
        resp = client.get("/api/v1/land-prices/")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_be_lp_list_02_all(self, client, db_session):
        """全 3 件取得"""
        for i in range(3):
            db_session.add(_make_record(address=f"addr{i}"))
        db_session.commit()
        resp = client.get("/api/v1/land-prices/")
        assert resp.status_code == 200
        assert len(resp.json()) == 3

    def test_be_lp_list_03_prefecture_filter(self, client, db_session):
        """prefecture_code フィルタ"""
        db_session.add(_make_record(prefecture_code="13", city_code="13101", address="a1"))
        db_session.add(_make_record(prefecture_code="14", city_code="14101", address="a2"))
        db_session.commit()
        resp = client.get("/api/v1/land-prices/?prefecture_code=13")
        data = resp.json()
        assert all(r["prefecture_code"] == "13" for r in data)
        assert len(data) == 1

    def test_be_lp_list_04_city_code_filter(self, client, db_session):
        """city_code フィルタ"""
        db_session.add(_make_record(city_code="13101", address="a1"))
        db_session.add(_make_record(city_code="13102", address="a2"))
        db_session.commit()
        resp = client.get("/api/v1/land-prices/?city_code=13101")
        data = resp.json()
        assert all(r["city_code"] == "13101" for r in data)

    def test_be_lp_list_05_year_filter(self, client, db_session):
        """year フィルタ"""
        db_session.add(_make_record(year=2022, address="a1"))
        db_session.add(_make_record(year=2023, address="a2"))
        db_session.commit()
        resp = client.get("/api/v1/land-prices/?year=2022")
        data = resp.json()
        assert all(r["year"] == 2022 for r in data)

    def test_be_lp_list_06_limit(self, client, db_session):
        """limit パラメータ"""
        for i in range(5):
            db_session.add(_make_record(address=f"addr{i}"))
        db_session.commit()
        resp = client.get("/api/v1/land-prices/?limit=2")
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_be_lp_list_07_offset(self, client, db_session):
        """offset パラメータ"""
        for i in range(5):
            db_session.add(_make_record(address=f"addr{i}"))
        db_session.commit()
        resp = client.get("/api/v1/land-prices/?offset=2")
        assert resp.status_code == 200
        assert len(resp.json()) == 3

    def test_be_lp_list_08_limit_over_1000(self, client):
        """limit 上限超過 → HTTP 422"""
        resp = client.get("/api/v1/land-prices/?limit=1001")
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# POST /api/v1/land-prices/ — 登録
# ---------------------------------------------------------------------------

class TestCreateLandPrice:
    _valid_payload = {
        "prefecture_code": "13",
        "prefecture_name": "東京都",
        "city_code": "13101",
        "city_name": "千代田区",
        "price_per_sqm": 500000,
        "year": 2024,
        "address": "千代田1-1",
    }

    def test_be_lp_post_01_create(self, client):
        """正常登録 → HTTP 201"""
        resp = client.post("/api/v1/land-prices/", json=self._valid_payload)
        assert resp.status_code == 201
        assert resp.json()["city_code"] == "13101"

    def test_be_lp_post_02_duplicate(self, client):
        """重複登録 → HTTP 409"""
        client.post("/api/v1/land-prices/", json=self._valid_payload)
        resp = client.post("/api/v1/land-prices/", json=self._valid_payload)
        assert resp.status_code == 409

    def test_be_lp_post_03_missing_field(self, client):
        """必須フィールド欠落 → HTTP 422"""
        payload = dict(self._valid_payload)
        del payload["price_per_sqm"]
        resp = client.post("/api/v1/land-prices/", json=payload)
        assert resp.status_code == 422

    def test_be_lp_post_04_type_error(self, client):
        """型不正 → HTTP 422"""
        payload = dict(self._valid_payload)
        payload["price_per_sqm"] = "abc"
        payload["address"] = "addr-type-error"
        resp = client.post("/api/v1/land-prices/", json=payload)
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/v1/land-prices/summary/cities — サマリー
# ---------------------------------------------------------------------------

class TestCityAnnualSummary:
    def test_be_lp_sum_01_empty(self, client):
        """データなし → 空配列"""
        resp = client.get("/api/v1/land-prices/summary/cities")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_be_lp_sum_02_aggregation(self, client, db_session):
        """集計の正確性: avg=200, min=100, max=300"""
        for price, addr in [(100, "a1"), (200, "a2"), (300, "a3")]:
            db_session.add(_make_record(price_per_sqm=price, address=addr))
        db_session.commit()
        resp = client.get("/api/v1/land-prices/summary/cities")
        assert resp.status_code == 200
        row = resp.json()[0]
        assert row["avg_price_per_sqm"] == pytest.approx(200.0, rel=1e-3)
        assert row["min_price_per_sqm"] == 100
        assert row["max_price_per_sqm"] == 300
        assert row["record_count"] == 3

    def test_be_lp_sum_03_prefecture_filter(self, client, db_session):
        """prefecture_code フィルタ"""
        db_session.add(_make_record(prefecture_code="13", city_code="13101", address="a1"))
        db_session.add(_make_record(prefecture_code="14", city_code="14101", address="a2"))
        db_session.commit()
        resp = client.get("/api/v1/land-prices/summary/cities?prefecture_code=13")
        data = resp.json()
        assert all(r["city_code"].startswith("131") for r in data)
        assert len(data) == 1

    def test_be_lp_sum_04_multiple_cities_years(self, client, db_session):
        """2 市区 × 3 年分 → 6 行"""
        for city_code in ["13101", "13102"]:
            for year in [2022, 2023, 2024]:
                db_session.add(_make_record(city_code=city_code, year=year, address=f"{city_code}-{year}"))
        db_session.commit()
        resp = client.get("/api/v1/land-prices/summary/cities")
        assert resp.status_code == 200
        assert len(resp.json()) == 6
