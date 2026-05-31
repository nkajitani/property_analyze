import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.batch_job import BatchJob


class JobManager:
    def create(self, db: Session, job_type: str, params: dict) -> BatchJob:
        job = BatchJob(id=str(uuid.uuid4()), job_type=job_type, status="queued", params=params)
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    def get(self, db: Session, job_id: str) -> BatchJob | None:
        return db.get(BatchJob, job_id)

    def update_status(
        self,
        db: Session,
        job_id: str,
        status: str,
        progress: dict | None = None,
        error: str | None = None,
    ) -> None:
        job = db.get(BatchJob, job_id)
        if not job:
            return
        job.status = status
        if progress is not None:
            job.progress = progress
        if error is not None:
            job.error_message = error
        if status == "running" and job.started_at is None:
            job.started_at = datetime.now(timezone.utc)
        if status in ("completed", "failed", "partial"):
            job.finished_at = datetime.now(timezone.utc)
        db.commit()


job_manager = JobManager()
