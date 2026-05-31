import asyncio
import logging

from sqlalchemy.orm import Session

from app.batch.base import parse_land_price_feature, upsert_records
from app.models.land_price import RawLandPrice
from app.schemas.ingest import LandPriceIngestRequest
from app.services.job_manager import job_manager
from app.services.reinfolib import ReinfilibClient
from app.services.tile_calculator import bbox_to_tiles
from app.config import settings

logger = logging.getLogger(__name__)

# 一都三県全体の bounding box
_KANTO_BBOX = (35.0, 138.8, 36.3, 140.2)


def run_fetch_land_prices(job_id: str, payload: LandPriceIngestRequest, db: Session) -> None:
    asyncio.run(_fetch(job_id, payload, db))


async def _fetch(job_id: str, payload: LandPriceIngestRequest, db: Session) -> None:
    job_manager.update_status(db, job_id, "running")
    client = ReinfilibClient()
    zoom = settings.batch_zoom_level
    min_lat, min_lon, max_lat, max_lon = _KANTO_BBOX

    tiles = list(bbox_to_tiles(min_lat, min_lon, max_lat, max_lon, zoom))
    total = len(tiles) * len(range(payload.year_from, payload.year_to + 1))
    processed = 0
    upserted = 0
    skipped = 0
    errors = 0

    try:
        for year in range(payload.year_from, payload.year_to + 1):
            for z, x, y in tiles:
                features = await client.fetch_tile(
                    "XPT002", z, x, y,
                    extra_params={"year": str(year)},
                )
                records: list[dict] = []
                for feat in features:
                    parsed = parse_land_price_feature(feat, payload.pref_codes, year)
                    if parsed:
                        records.append(parsed)
                    else:
                        skipped += 1

                if not payload.dry_run and records:
                    upserted += upsert_records(
                        db, RawLandPrice, records, "uq_land_price_entry",
                        dedup_keys=["city_code", "year", "address"],
                    )

                processed += 1
                job_manager.update_status(
                    db, job_id, "running",
                    progress={"total": total, "processed": processed, "upserted": upserted, "skipped": skipped, "errors": errors},
                )

        job_manager.update_status(
            db, job_id, "completed",
            progress={"total": total, "processed": processed, "upserted": upserted, "skipped": skipped, "errors": errors},
        )
    except Exception as e:
        logger.exception("fetch_land_prices ジョブ %s で例外が発生しました", job_id)
        job_manager.update_status(db, job_id, "failed", error=str(e))
