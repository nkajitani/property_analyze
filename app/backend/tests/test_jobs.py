"""
BE-JOB-01〜05: GET /api/v1/ingest/jobs/{job_id}
"""
import uuid
from unittest.mock import patch

from app.models.batch_job import BatchJob


def _create_job(db_session, status="queued", progress=None, error_message=None):
    job = BatchJob(
        id=str(uuid.uuid4()),
        job_type="land_prices",
        status=status,
        params={"year_from": 2024, "year_to": 2024},
        progress=progress,
        error_message=error_message,
    )
    db_session.add(job)
    db_session.commit()
    return job


class TestJobStatus:
    def test_be_job_01_exists(self, client, db_session, admin_headers):
        """存在するジョブ → HTTP 200"""
        job = _create_job(db_session)
        resp = client.get(f"/api/v1/ingest/jobs/{job.id}", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["job_id"] == job.id

    def test_be_job_02_not_found(self, client, admin_headers):
        """存在しないジョブ → HTTP 404"""
        fake_id = str(uuid.uuid4())
        resp = client.get(f"/api/v1/ingest/jobs/{fake_id}", headers=admin_headers)
        assert resp.status_code == 404

    def test_be_job_03_no_auth(self, client, db_session):
        """認証ヘッダーなし → HTTP 403"""
        job = _create_job(db_session)
        resp = client.get(f"/api/v1/ingest/jobs/{job.id}")
        assert resp.status_code == 403

    def test_be_job_04_completed(self, client, db_session, admin_headers):
        """completed ジョブ → finished_at が null でない"""
        from datetime import datetime, timezone
        job = _create_job(db_session, status="completed")
        job.finished_at = datetime.now(timezone.utc)
        db_session.commit()
        resp = client.get(f"/api/v1/ingest/jobs/{job.id}", headers=admin_headers)
        data = resp.json()
        assert data["status"] == "completed"
        assert data["finished_at"] is not None

    def test_be_job_05_running(self, client, db_session, admin_headers):
        """running ジョブ → progress に total / processed が含まれる"""
        job = _create_job(
            db_session,
            status="running",
            progress={"total": 100, "processed": 50, "total_tiles": 10, "processed_tiles": 5},
        )
        resp = client.get(f"/api/v1/ingest/jobs/{job.id}", headers=admin_headers)
        data = resp.json()
        assert data["status"] == "running"
        assert data["progress"] is not None
