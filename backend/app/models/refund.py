from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class RefundStatus:
    PENDING = "PENDING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"

    ALL = (PENDING, PROCESSED, FAILED)


class RefundInitiator:
    CUSTOMER = "CUSTOMER"
    PROVIDER = "PROVIDER"
    SYSTEM = "SYSTEM"


class Refund(Base, TimestampMixin):
    __tablename__ = "refunds"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    payment_order_id: Mapped[int] = mapped_column(ForeignKey("payment_orders.id"), nullable=False, index=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id"), nullable=False, index=True)

    amount: Mapped[float] = mapped_column(Float, nullable=False)
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    initiated_by_role: Mapped[str] = mapped_column(String(20), nullable=False)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default=RefundStatus.PENDING)
    gateway_refund_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
