import logging

import httpx
from sqlalchemy.orm import Session

from app.batch.base import parse_transaction_feature, upsert_records
from app.batch.city_code_map import CITY_CODE_MAP
from app.config import settings
from app.models.transaction_price import RawTransactionPrice
from app.schemas.ingest import TransactionIngestRequest
from app.services.job_manager import job_manager

logger = logging.getLogger(__name__)

_XIT001_URL = "https://www.reinfolib.mlit.go.jp/ex-api/external/XIT001"
_API_CAP = 8191


def _city_codes_for(pref_codes: list[str]) -> list[str]:
    """CITY_CODE_MAP から対象都道府県の市区町村コード一覧を返す（郡部コード除外）"""
    result = []
    for code in CITY_CODE_MAP:
        if any(code.startswith(p) for p in pref_codes) and not code.endswith("900"):
            result.append(code)
    return sorted(result)


def run_fetch_transaction_prices(job_id: str, payload: TransactionIngestRequest, db: Session) -> None:
    job_manager.update_status(db, job_id, "running")

    headers = {"Ocp-Apim-Subscription-Key": settings.re_info_lib_key}
    years = list(range(payload.year_from, payload.year_to + 1))
    quarters = list(range(payload.quarter_from, payload.quarter_to + 1))
    city_codes = _city_codes_for(payload.pref_codes)

    total = len(city_codes) * len(years) * len(quarters)
    processed = 0
    upserted = 0
    skipped = 0
    errors = 0

    logger.info("fetch_transaction_prices 開始: %d市区町村 × %d年 × %d四半期 = %d リクエスト",
                len(city_codes), len(years), len(quarters), total)

    try:
        for city_code in city_codes:
            for year in years:
                for quarter in quarters:
                    try:
                        resp = httpx.get(
                            _XIT001_URL,
                            params={
                                "year": str(year),
                                "quarter": str(quarter),
                                "city": city_code,
                                "priceClassification": "01",
                            },
                            headers=headers,
                            timeout=60,
                        )
                        if resp.status_code == 404:
                            processed += 1
                            job_manager.update_status(
                                db, job_id, "running",
                                progress={"total": total, "processed": processed,
                                          "upserted": upserted, "skipped": skipped, "errors": errors},
                            )
                            continue
                        resp.raise_for_status()
                        items: list[dict] = resp.json().get("data", [])
                    except Exception as e:
                        logger.warning("city=%s year=%d q=%d 取得失敗: %s", city_code, year, quarter, e)
                        errors += 1
                        processed += 1
                        job_manager.update_status(
                            db, job_id, "running",
                            progress={"total": total, "processed": processed,
                                      "upserted": upserted, "skipped": skipped, "errors": errors},
                        )
                        continue

                    if len(items) >= _API_CAP:
                        logger.warning("city=%s year=%d q=%d: %d件（API上限到達）",
                                       city_code, year, quarter, len(items))

                    records: list[dict] = []
                    for item in items:
                        parsed = parse_transaction_feature(item, payload.pref_codes)
                        if parsed:
                            records.append(parsed)
                        else:
                            skipped += 1

                    if not payload.dry_run and records:
                        upserted += upsert_records(
                            db, RawTransactionPrice, records, "uq_transaction_price_entry",
                            dedup_keys=["city_code", "trade_period", "district_name",
                                        "trade_price", "area_sqm", "transaction_type"],
                        )

                    processed += 1
                    if items:
                        logger.info("city=%s year=%d q=%d → %d件 upsert %d件",
                                    city_code, year, quarter, len(items), len(records))
                    job_manager.update_status(
                        db, job_id, "running",
                        progress={"total": total, "processed": processed,
                                  "upserted": upserted, "skipped": skipped, "errors": errors},
                    )

        job_manager.update_status(
            db, job_id, "completed",
            progress={"total": total, "processed": processed,
                      "upserted": upserted, "skipped": skipped, "errors": errors},
        )
    except Exception as e:
        logger.exception("fetch_transaction_prices ジョブ %s で例外が発生しました", job_id)
        job_manager.update_status(db, job_id, "failed", error=str(e))
