"""
BE-DEP-01〜03: dependencies.verify_admin_token
"""
import pytest
from fastapi import HTTPException


class TestVerifyAdminToken:
    def test_be_dep_01_correct_token(self):
        """正しいトークン → 例外なし"""
        import asyncio
        from app.dependencies import verify_admin_token
        from app.config import settings
        settings.admin_token = "test-admin-token"
        # verify_admin_token は async 関数
        asyncio.run(verify_admin_token(x_admin_token="test-admin-token"))

    def test_be_dep_02_wrong_token(self):
        """間違ったトークン → HTTPException 403"""
        import asyncio
        from app.dependencies import verify_admin_token
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(verify_admin_token(x_admin_token="wrong"))
        assert exc_info.value.status_code == 403

    def test_be_dep_03_empty_token(self):
        """空文字トークン → HTTPException 403"""
        import asyncio
        from app.dependencies import verify_admin_token
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(verify_admin_token(x_admin_token=""))
        assert exc_info.value.status_code == 403
