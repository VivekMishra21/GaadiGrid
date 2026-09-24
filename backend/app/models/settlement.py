from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class SettlementStatus:
    PENDING = "PENDING"
    PAID_OUT = "PAID_OUT"

    ALL = (PENDING, PAID_OUT)


class Settlement(Base, TimestampMixin):
    """What GaadiGrid owes a provider for one completed, paid booking. `commission_rate`
    and the derived amounts are snapshotted at creation time — a later change to the
    platform commission rate must never retroactively change an existing settlement.
    Paying out is a manual admin action in this phase (no real payout/banking
    integration yet — see docs/RISKS_AND_PENDING_INTEGRATIONS.md)."""

    __tablename__ = "settlements"
    __table_args__ = (UniqueConstraint("booking_id", name="uq_settlement_booking"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    provider_id: Mapped[int] = mapped_column(ForeignKey("providers.id"), nullable=False, index=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id"), nullable=False, index=True)

    gross_amount: Mapped[float] = mapped_column(Float, nullable=False)
    commission_rate: Mapped[float] = mapped_column(Float, nullable=False)
    commission_amount: Mapped[float] = mapped_column(Float, nullable=False)
    net_payable_amount: Mapped[float] = mapped_column(Float, nullable=False)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default=SettlementStatus.PENDING, index=True)
    paid_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
