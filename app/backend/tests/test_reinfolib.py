"""
BE-REIN-01〜09: services/reinfolib.py
"""
import asyncio
import logging

import httpx
import pytest

from unittest.mock import patch, MagicMock, AsyncMock


class TestReinfilibClient:
    """httpx モックを使って reinfolib クライアントをテスト"""

    def _make_client(self):
        from app.config import settings
        with patch.object(settings, "re_info_lib_key", "test-key"):
            from app.services.reinfolib import ReinfilibClient
            client = ReinfilibClient()
        return client

    def _run(self, coro):
        return asyncio.run(coro)

    def test_be_rein_01_success(self):
        """HTTP 200 + GeoJSON → features リストを返す"""
        features = [{"type": "Feature", "properties": {}}]
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"features": features}
        mock_resp.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=mock_resp)):
            from app.services.reinfolib import ReinfilibClient
            client = ReinfilibClient()
            result = self._run(client.fetch_tile("XPT002", 12, 3637, 1613, {}))
        assert result == features

    def test_be_rein_02_empty_features(self):
        """空 features → []"""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"features": []}
        mock_resp.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=mock_resp)):
            from app.services.reinfolib import ReinfilibClient
            client = ReinfilibClient()
            result = self._run(client.fetch_tile("XPT002", 12, 3637, 1613, {}))
        assert result == []

    def test_be_rein_05_http_401(self):
        """HTTP 401 → RuntimeError 送出"""
        mock_resp = MagicMock()
        mock_resp.status_code = 401

        with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=mock_resp)):
            from app.services.reinfolib import ReinfilibClient
            client = ReinfilibClient()
            with pytest.raises(RuntimeError):
                self._run(client.fetch_tile("XPT002", 12, 3637, 1613, {}))

    def test_be_rein_06_http_403(self):
        """HTTP 403 → RuntimeError 送出"""
        mock_resp = MagicMock()
        mock_resp.status_code = 403

        with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=mock_resp)):
            from app.services.reinfolib import ReinfilibClient
            client = ReinfilibClient()
            with pytest.raises(RuntimeError):
                self._run(client.fetch_tile("XPT002", 12, 3637, 1613, {}))

    def test_be_rein_04_429_all_retries(self):
        """429 がリトライ上限超過 → 空リスト"""
        mock_resp = MagicMock()
        mock_resp.status_code = 429

        with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=mock_resp)):
            with patch("asyncio.sleep", new=AsyncMock()):
                from app.config import settings
                with patch.object(settings, "batch_max_retries", 1):
                    with patch.object(settings, "batch_retry_backoff_base_sec", 0.001):
                        from app.services.reinfolib import ReinfilibClient
                        client = ReinfilibClient()
                        result = self._run(client.fetch_tile("XPT002", 12, 3637, 1613, {}))
        assert result == []

    def test_be_rein_09_api_key_not_in_log(self, caplog):
        """APIキーがログに含まれない"""
        mock_resp = MagicMock()
        mock_resp.status_code = 401

        with caplog.at_level(logging.ERROR, logger="app.services.reinfolib"):
            with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=mock_resp)):
                from app.config import settings
                with patch.object(settings, "re_info_lib_key", "SECRET-API-KEY-12345"):
                    from app.services.reinfolib import ReinfilibClient
                    client = ReinfilibClient()
                    try:
                        asyncio.run(client.fetch_tile("XPT002", 12, 3637, 1613, {}))
                    except RuntimeError:
                        pass

        for record in caplog.records:
            assert "SECRET-API-KEY-12345" not in record.getMessage()
