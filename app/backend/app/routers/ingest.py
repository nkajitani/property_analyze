from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.batch.fetch_land_prices import run_fetch_land_prices
from app.batch.fetch_transaction_prices import run_fetch_transaction_prices
from app.config import settings
from app.database import get_db
from app.dependencies import verify_admin_token
from app.schemas.ingest import JobStatusResponse, LandPriceIngestRequest, TransactionIngestRequest
from app.services.job_manager import job_manager

router = APIRouter()


@router.post("/land-prices", dependencies=[Depends(verify_admin_token)], status_code=202)
async def ingest_land_prices(
    payload: LandPriceIngestRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict:
    if not settings.re_info_lib_key:
        raise HTTPException(status_code=503, detail="RE_INFO_LIB_KEY が未設定です")
    job = job_manager.create(db, job_type="land_prices", params=payload.model_dump())
    background_tasks.add_task(run_fetch_land_prices, job.id, payload, db)
    return {"job_id": job.id, "status": "queued", "message": "バッチジョブをキューに登録しました。"}


@router.post("/transactions", dependencies=[Depends(verify_admin_token)], status_code=202)
async def ingest_transactions(
    payload: TransactionIngestRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict:
    if not settings.re_info_lib_key:
        raise HTTPException(status_code=503, detail="RE_INFO_LIB_KEY が未設定です")
    job = job_manager.create(db, job_type="transactions", params=payload.model_dump())
    background_tasks.add_task(run_fetch_transaction_prices, job.id, payload, db)
    return {"job_id": job.id, "status": "queued", "message": "バッチジョブをキューに登録しました。"}


@router.get("/jobs/{job_id}", dependencies=[Depends(verify_admin_token)], response_model=JobStatusResponse)
def get_job_status(job_id: str, db: Session = Depends(get_db)) -> JobStatusResponse:
    job = job_manager.get(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="ジョブが見つかりません")
    return JobStatusResponse(
        job_id=job.id,
        job_type=job.job_type,
        status=job.status,
        progress=job.progress,
        started_at=job.started_at.isoformat() if job.started_at else None,
        finished_at=job.finished_at.isoformat() if job.finished_at else None,
        error_message=job.error_message,
    )
