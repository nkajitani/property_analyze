from fastapi import Header, HTTPException

from app.config import settings


async def verify_admin_token(x_admin_token: str = Header(...)) -> None:
    if x_admin_token != settings.admin_token:
        raise HTTPException(status_code=403, detail="認証に失敗しました")
