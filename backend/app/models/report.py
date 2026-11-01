import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Text, JSON
from app.core.database import Base

class ReportFormat(str, enum.Enum):
    CSV = "CSV"
    PDF = "PDF"

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    station_id = Column(Integer, ForeignKey("stations.id", ondelete="CASCADE"), nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    file_format = Column(Enum(ReportFormat), nullable=False, default=ReportFormat.PDF)
    file_path = Column(String(500), nullable=False)
    summary_metrics = Column(JSON, nullable=True)
    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
