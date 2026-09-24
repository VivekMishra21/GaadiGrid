from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class PaymentOrderStatus:
    CREATED = "CREATED"
    PAID = "PAID"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"

    ALL = (CREATED, PAID, FAILED, REFUNDED)


class PaymentGateway:
    DEV = "dev"
    RAZORPAY = "razorpay"


class PaymentOrder(Base, TimestampMixin):
    """One row per payment attempt for a booking. A booking can have more than one
    (e.g. a FAILED order followed by a retry) — the service layer treats the most
    recent non-FAILED order as authoritative rather than enforcing a DB uniqueness
    constraint, since a failed attempt must never block a retry."""

    __tablename__ = "payment_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id"), nullable=False, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    gateway: Mapped[str] = mapped_column(String(20), nullable=False)
    gateway_order_id: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)

    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=PaymentOrderStatus.CREATED, index=True)

    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
