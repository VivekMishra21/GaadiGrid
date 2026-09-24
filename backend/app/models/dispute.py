from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class DisputeStatus:
    OPEN = "OPEN"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"

    ALL = (OPEN, RESOLVED, DISMISSED)


class Dispute(Base, TimestampMixin):
    """Raised by either party on a booking. Only one `OPEN` dispute is allowed per
    booking at a time (enforced in the service layer, not the schema, matching how the
    booking/verification state machines enforce their own rules). Only an admin can
    resolve or dismiss one."""

    __tablename__ = "disputes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id"), nullable=False, index=True)
    raised_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    reason: Mapped[str] = mapped_column(String(1000), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=DisputeStatus.OPEN, index=True)

    resolution_note: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    resolved_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
