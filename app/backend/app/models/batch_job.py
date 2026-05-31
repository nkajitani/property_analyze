import uuid

from sqlalchemy import Column, DateTime, JSON, String, Text, func

from app.database import Base


class BatchJob(Base):
    __tablename__ = "batch_jobs"

    id            = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_type      = Column(String(20), nullable=False)
    status        = Column(String(20), nullable=False, default="queued")
    params        = Column(JSON, nullable=False)
    progress      = Column(JSON)
    error_message = Column(Text)
    started_at    = Column(DateTime)
    finished_at   = Column(DateTime)
    created_at    = Column(DateTime, server_default=func.now())
