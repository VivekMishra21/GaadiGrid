from sqlalchemy import Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class QueueReportType:
    NO_QUEUE = "NO_QUEUE"
    WAIT_5_10 = "WAIT_5_10"
    WAIT_10_20 = "WAIT_10_20"
    WAIT_20_30 = "WAIT_20_30"
    WAIT_30_PLUS = "WAIT_30_PLUS"
    CNG_UNAVAILABLE = "CNG_UNAVAILABLE"
    CNG_LOW_PRESSURE = "CNG_LOW_PRESSURE"
    CNG_NORMAL_PRESSURE = "CNG_NORMAL_PRESSURE"
    CNG_GOOD_PRESSURE = "CNG_GOOD_PRESSURE"

    QUEUE_TYPES = (NO_QUEUE, WAIT_5_10, WAIT_10_20, WAIT_20_30, WAIT_30_PLUS)
    CNG_TYPES = (CNG_UNAVAILABLE, CNG_LOW_PRESSURE, CNG_NORMAL_PRESSURE, CNG_GOOD_PRESSURE)
    ALL = QUEUE_TYPES + CNG_TYPES


class QueueReport(Base, TimestampMixin):
    __tablename__ = "queue_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    station_id: Mapped[int] = mapped_column(ForeignKey("fuel_stations.id"), nullable=False, index=True)
    reported_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    report_type: Mapped[str] = mapped_column(String(30), nullable=False)

    reporter_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    reporter_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Snapshot at submission time (the reporter's role could change later; this
    # keeps historical trust-weighting stable and avoids a join for every read).
    is_verified_partner_report: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
