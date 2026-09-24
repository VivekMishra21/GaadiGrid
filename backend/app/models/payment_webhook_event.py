from sqlalchemy import Boolean, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class PaymentWebhookEvent(Base, TimestampMixin):
    """Audit trail of every webhook call received, valid or not — this is what makes
    webhook processing idempotent (a gateway may deliver the same event more than
    once) and gives a forensic record of unsigned/forged attempts."""

    __tablename__ = "payment_webhook_events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    gateway: Mapped[str] = mapped_column(String(20), nullable=False)
    gateway_event_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    gateway_order_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    signature_valid: Mapped[bool] = mapped_column(Boolean, nullable=False)
    raw_payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
