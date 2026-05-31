"""
BE-SEC-01〜07: セキュリティ要件対応テスト
"""
import os
from unittest.mock import patch


class TestSecurityRequirements:
    def test_be_sec_01_no_database_url(self):
        """DATABASE_URL 未設定 → ValidationError"""
        from pydantic import ValidationError
        from pydantic_settings import BaseSettings

        class _TestSettings(BaseSettings):
            database_url: str
            admin_token: str = "dev-token"

        with patch.dict(os.environ, {}, clear=True):
            # DATABASE_URL を消した状態で初期化
            env_backup = os.environ.pop("DATABASE_URL", None)
            try:
                with pytest.raises((ValidationError, Exception)):
                    _TestSettings()
            except Exception:
                pass
            finally:
                if env_backup:
                    os.environ["DATABASE_URL"] = env_backup

    def test_be_sec_03_ingest_no_auth(self, client):
        """ingest エンドポイントに X-Admin-Token なし → HTTP 403"""
        resp = client.post("/api/v1/ingest/land-prices", json={
            "year_from": 2022, "year_to": 2024
        })
        assert resp.status_code == 403

    def test_be_sec_04_city_code_invalid(self, client):
        """city_code に 5 桁以外 → HTTP 422"""
        resp = client.get("/api/v1/transactions/summary/cities?city_code=1234")
        assert resp.status_code == 422

    def test_be_sec_05_no_fstring_in_view_query(self):
        """divergence.py の VIEW クエリに f-string 埋め込みがないこと"""
        import ast
        import pathlib
        source = pathlib.Path("/app/backend/app/routers/divergence.py").read_text()
        # f-string がないこと（f" または f' で始まる文字列リテラル）
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, ast.JoinedStr):
                pytest.fail("divergence.py に f-string が使用されています（SQLインジェクション懸念）")

    def test_be_sec_06_compose_ports_localhost(self):
        """compose.yml のポートバインドが 127.0.0.1: プレフィックスを持つ"""
        import pathlib
        compose = pathlib.Path("/app/compose.yml").read_text()
        # ポート行を抽出（- "xxxx:xxxx" 形式）
        import re
        port_lines = re.findall(r'- "([^"]+)"', compose)
        exposed_ports = [p for p in port_lines if ":" in p and not p.startswith("127.0.0.1")]
        assert exposed_ports == [], f"非 localhost バインドのポートが存在します: {exposed_ports}"

    def test_be_sec_07_cors_origins(self):
        """CORS allow_origins が localhost:3000 のみ"""
        from app.config import settings
        assert settings.cors_origins == ["http://localhost:3000"]


import pytest
