from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class QueueReportFlag(Base, TimestampMixin):
    """A user reporting that a specific queue report looks wrong. Flagged reports
    are excluded from the combined-status calculation once they cross a threshold —
    see services/queue_status_service.py."""

    __tablename__ = "queue_report_flags"
    __table_args__ = (UniqueConstraint("queue_report_id", "flagged_by_id", name="uq_queue_report_flag"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    queue_report_id: Mapped[int] = mapped_column(ForeignKey("queue_reports.id"), nullable=False, index=True)
    flagged_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
