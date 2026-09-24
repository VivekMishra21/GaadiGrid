from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, SoftDeleteMixin, TimestampMixin


class VerificationStatus:
    UNVERIFIED = "UNVERIFIED"
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"

    ALL = (UNVERIFIED, PENDING, VERIFIED, REJECTED)


class Provider(Base, TimestampMixin, SoftDeleteMixin):
    """A car-care service business, self-registered by a PROVIDER_OWNER account.
    Verification (Phase 5) is a real workflow — owner submits business/GST
    registration numbers, admin approves or rejects — but deliberately does NOT gate
    booking creation, matching the same reasoning as Phase 3's original comment:
    marketplaces need supply before they can meaningfully gate on trust signals."""

    __tablename__ = "providers"
    __table_args__ = (UniqueConstraint("owner_user_id", name="uq_provider_owner"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    address: Mapped[str] = mapped_column(String(500), nullable=False)
    city: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    locality: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    verification_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=VerificationStatus.UNVERIFIED, index=True
    )
    business_registration_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    gst_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    verification_notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    verification_submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
