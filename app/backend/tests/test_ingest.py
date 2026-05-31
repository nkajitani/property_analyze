"""
BE-ING-LP-01〜10: POST /api/v1/ingest/land-prices
BE-ING-TX-01〜06: POST /api/v1/ingest/transactions
"""
import os
from unittest.mock import patch, MagicMock

import pytest


_VALID_LP_PAYLOAD = {
    "year_from": 2022,
    "year_to": 2024,
    "pref_codes": ["13", "14"],
    "dry_run": True,
}

_VALID_TX_PAYLOAD = {
    "year_from": 2022,
    "year_to": 2024,
    "pref_codes": ["13", "14"],
    "quarter_from": 1,
    "quarter_to": 4,
    "dry_run": True,
}


class TestIngestLandPrices:
    def test_be_ing_lp_01_normal(self, client, admin_headers):
        """正常起動 dry_run=true → HTTP 202 + job_id"""
        from app.config import settings
        with patch.object(settings, "re_info_lib_key", "dummy-key"):
            with patch("app.batch.fetch_land_prices.run_fetch_land_prices"):
                resp = client.post(
                    "/api/v1/ingest/land-prices",
                    json=_VALID_LP_PAYLOAD,
                    headers=admin_headers,
                )
        assert resp.status_code == 202
        data = resp.json()
        assert "job_id" in data
        import re
        assert re.match(r"[0-9a-f-]{36}", data["job_id"])

    def test_be_ing_lp_02_no_auth(self, client):
        """認証ヘッダーなし → HTTP 403"""
        resp = client.post("/api/v1/ingest/land-prices", json=_VALID_LP_PAYLOAD)
        assert resp.status_code == 403

    def test_be_ing_lp_03_wrong_token(self, client):
        """認証トークン不一致 → HTTP 403"""
        resp = client.post(
            "/api/v1/ingest/land-prices",
            json=_VALID_LP_PAYLOAD,
            headers={"X-Admin-Token": "wrongtoken"},
        )
        assert resp.status_code == 403

    def test_be_ing_lp_04_year_from_too_old(self, client, admin_headers):
        """year_from 下限違反 → HTTP 422"""
        payload = dict(_VALID_LP_PAYLOAD, year_from=1999)
        resp = client.post("/api/v1/ingest/land-prices", json=payload, headers=admin_headers)
        assert resp.status_code == 422

    def test_be_ing_lp_05_year_from_too_future(self, client, admin_headers):
        """year_from 上限違反 → HTTP 422"""
        payload = dict(_VALID_LP_PAYLOAD, year_from=2100)
        resp = client.post("/api/v1/ingest/land-prices", json=payload, headers=admin_headers)
        assert resp.status_code == 422

    def test_be_ing_lp_06_year_order(self, client, admin_headers):
        """year_from > year_to → HTTP 422"""
        payload = dict(_VALID_LP_PAYLOAD, year_from=2024, year_to=2022)
        resp = client.post("/api/v1/ingest/land-prices", json=payload, headers=admin_headers)
        assert resp.status_code == 422

    def test_be_ing_lp_07_invalid_pref_code(self, client, admin_headers):
        """allowlist 外 pref_codes → HTTP 422"""
        payload = dict(_VALID_LP_PAYLOAD, pref_codes=["99"])
        resp = client.post("/api/v1/ingest/land-prices", json=payload, headers=admin_headers)
        assert resp.status_code == 422

    def test_be_ing_lp_08_out_of_scope_pref(self, client, admin_headers):
        """一都三県外 pref_codes → HTTP 422"""
        payload = dict(_VALID_LP_PAYLOAD, pref_codes=["01"])
        resp = client.post("/api/v1/ingest/land-prices", json=payload, headers=admin_headers)
        assert resp.status_code == 422

    def test_be_ing_lp_09_no_api_key(self, client, admin_headers):
        """RE_INFO_LIB_KEY 未設定 → HTTP 503"""
        from app.config import settings
        with patch.object(settings, "re_info_lib_key", ""):
            resp = client.post(
                "/api/v1/ingest/land-prices",
                json=_VALID_LP_PAYLOAD,
                headers=admin_headers,
            )
        assert resp.status_code == 503

    def test_be_ing_lp_10_default_pref_codes(self, client, admin_headers):
        """pref_codes 省略 → HTTP 202"""
        from app.config import settings
        payload = {"year_from": 2022, "year_to": 2024, "dry_run": True}
        with patch.object(settings, "re_info_lib_key", "dummy-key"):
            with patch("app.batch.fetch_land_prices.run_fetch_land_prices"):
                resp = client.post(
                    "/api/v1/ingest/land-prices",
                    json=payload,
                    headers=admin_headers,
                )
        assert resp.status_code == 202


class TestIngestTransactions:
    def test_be_ing_tx_01_normal(self, client, admin_headers):
        """正常起動 → HTTP 202"""
        from app.config import settings
        with patch.object(settings, "re_info_lib_key", "dummy-key"):
            with patch("app.batch.fetch_transaction_prices.run_fetch_transaction_prices"):
                resp = client.post(
                    "/api/v1/ingest/transactions",
                    json=_VALID_TX_PAYLOAD,
                    headers=admin_headers,
                )
        assert resp.status_code == 202

    def test_be_ing_tx_02_no_auth(self, client):
        """認証ヘッダーなし → HTTP 403"""
        resp = client.post("/api/v1/ingest/transactions", json=_VALID_TX_PAYLOAD)
        assert resp.status_code == 403

    def test_be_ing_tx_03_quarter_from_zero(self, client, admin_headers):
        """quarter_from=0 → HTTP 422"""
        payload = dict(_VALID_TX_PAYLOAD, quarter_from=0)
        resp = client.post("/api/v1/ingest/transactions", json=payload, headers=admin_headers)
        assert resp.status_code == 422

    def test_be_ing_tx_04_quarter_to_five(self, client, admin_headers):
        """quarter_to=5 → HTTP 422"""
        payload = dict(_VALID_TX_PAYLOAD, quarter_to=5)
        resp = client.post("/api/v1/ingest/transactions", json=payload, headers=admin_headers)
        assert resp.status_code == 422

    def test_be_ing_tx_05_quarter_order(self, client, admin_headers):
        """quarter_from > quarter_to → HTTP 422"""
        payload = dict(_VALID_TX_PAYLOAD, quarter_from=3, quarter_to=1)
        resp = client.post("/api/v1/ingest/transactions", json=payload, headers=admin_headers)
        assert resp.status_code == 422

    def test_be_ing_tx_06_year_order(self, client, admin_headers):
        """year_from > year_to → HTTP 422"""
        payload = dict(_VALID_TX_PAYLOAD, year_from=2024, year_to=2022)
        resp = client.post("/api/v1/ingest/transactions", json=payload, headers=admin_headers)
        assert resp.status_code == 422
