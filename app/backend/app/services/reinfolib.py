import asyncio
import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)
_BASE_URL = "https://www.reinfolib.mlit.go.jp/ex-api/external"


class ReinfilibClient:
    def __init__(self) -> None:
        self._semaphore = asyncio.Semaphore(settings.batch_concurrent_requests)

    async def fetch_tile(
        self,
        endpoint: str,
        z: int,
        x: int,
        y: int,
        extra_params: dict,
    ) -> list[dict]:
        params = {"response_format": "geojson", "z": z, "x": x, "y": y, **extra_params}
        # APIキーはヘッダーに設定（ログ出力しない）
        headers = {"Ocp-Apim-Subscription-Key": settings.re_info_lib_key}

        async with self._semaphore:
            for attempt in range(settings.batch_max_retries + 1):
                try:
                    async with httpx.AsyncClient(timeout=settings.batch_request_timeout_sec) as client:
                        resp = await client.get(f"{_BASE_URL}/{endpoint}", params=params, headers=headers)
                    if resp.status_code in (401, 403):
                        logger.error("API 認証エラー（%d）。バッチを中断します。", resp.status_code)
                        raise RuntimeError("API 認証エラー")
                    if resp.status_code == 429:
                        wait = settings.batch_retry_backoff_base_sec ** attempt
                        logger.warning("Rate limit (429)。%.1f 秒後にリトライします。", wait)
                        await asyncio.sleep(wait)
                        continue
                    resp.raise_for_status()
                    data = resp.json()
                    return data.get("features", [])
                except (httpx.TimeoutException, httpx.HTTPStatusError) as e:
                    if attempt == settings.batch_max_retries:
                        status = e.response.status_code if isinstance(e, httpx.HTTPStatusError) else "timeout"
                        body = e.response.text[:200] if isinstance(e, httpx.HTTPStatusError) else ""
                        logger.warning(
                            "タイル (%d,%d,%d) 取得失敗。スキップします。status=%s body=%s",
                            z, x, y, status, body,
                        )
                        return []
                    await asyncio.sleep(settings.batch_retry_backoff_base_sec ** attempt)
        return []
