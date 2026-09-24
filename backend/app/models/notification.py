from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class NotificationType:
    REMINDER_INSURANCE = "REMINDER_INSURANCE"
    REMINDER_PUC = "REMINDER_PUC"
    REMINDER_SERVICE = "REMINDER_SERVICE"
    BOOKING_UPDATE = "BOOKING_UPDATE"
    GENERIC = "GENERIC"

    ALL = (REMINDER_INSURANCE, REMINDER_PUC, REMINDER_SERVICE, BOOKING_UPDATE, GENERIC)


class Notification(Base, TimestampMixin):
    """`dedup_key` prevents the reminder sweep from re-creating a notification for the
    same vehicle/reminder-type/urgency-threshold it already notified about (nullable —
    only reminder-driven notifications set it; a normal Postgres unique index allows any
    number of NULLs, so non-reminder notifications are unaffected)."""

    __tablename__ = "notifications"
    __table_args__ = (
        # Serves "list my notifications, newest first" (list_for_user) and the
        # unread-count/unread-filter queries (both always scope by user_id first) —
        # without these, both force a sort/filter over every notification row instead
        # of an index range scan as the table grows.
        Index("ix_notifications_user_id_created_at", "user_id", "created_at"),
        Index("ix_notifications_user_id_read_at", "user_id", "read_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    type: Mapped[str] = mapped_column(String(30), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(String(1000), nullable=False)
    data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    dedup_key: Mapped[str | None] = mapped_column(String(200), nullable=True, unique=True, index=True)

    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
