"""
BE-JM-01〜07: services/job_manager.py
"""
import uuid

from app.services.job_manager import JobManager


class TestJobManager:
    def test_be_jm_01_create(self, db_session):
        """create → UUID 形式の id、status=queued"""
        jm = JobManager()
        job = jm.create(db_session, job_type="land_prices", params={"year_from": 2024, "year_to": 2024})
        import re
        assert re.match(r"[0-9a-f-]{36}", job.id)
        assert job.status == "queued"

    def test_be_jm_02_get_exists(self, db_session):
        """create 後に get → BatchJob を返す"""
        jm = JobManager()
        job = jm.create(db_session, job_type="land_prices", params={})
        result = jm.get(db_session, job.id)
        assert result is not None
        assert result.id == job.id

    def test_be_jm_03_get_not_found(self, db_session):
        """存在しない UUID → None"""
        jm = JobManager()
        result = jm.get(db_session, str(uuid.uuid4()))
        assert result is None

    def test_be_jm_04_update_running(self, db_session):
        """running → started_at が設定される"""
        jm = JobManager()
        job = jm.create(db_session, job_type="land_prices", params={})
        jm.update_status(db_session, job.id, "running")
        updated = jm.get(db_session, job.id)
        assert updated.status == "running"
        assert updated.started_at is not None

    def test_be_jm_05_update_completed(self, db_session):
        """completed → finished_at が設定される"""
        jm = JobManager()
        job = jm.create(db_session, job_type="land_prices", params={})
        jm.update_status(db_session, job.id, "completed")
        updated = jm.get(db_session, job.id)
        assert updated.status == "completed"
        assert updated.finished_at is not None

    def test_be_jm_06_update_failed(self, db_session):
        """failed + error → error_message が設定される"""
        jm = JobManager()
        job = jm.create(db_session, job_type="land_prices", params={})
        jm.update_status(db_session, job.id, "failed", error="something went wrong")
        updated = jm.get(db_session, job.id)
        assert updated.status == "failed"
        assert updated.error_message == "something went wrong"

    def test_be_jm_07_update_nonexistent(self, db_session):
        """存在しない job_id への更新 → エラーなく処理"""
        jm = JobManager()
        # 例外が発生しないことを確認
        jm.update_status(db_session, str(uuid.uuid4()), "running")
