from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class ProviderStaffMember(Base, TimestampMixin):
    """Links a PROVIDER_STAFF user to the one provider business they work for. A
    staff user can be linked to at most one provider at a time (enforced by the
    unique constraint on user_id) — this app has no multi-employer staffing model."""

    __tablename__ = "provider_staff_members"
    __table_args__ = (UniqueConstraint("user_id", name="uq_provider_staff_user"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    provider_id: Mapped[int] = mapped_column(ForeignKey("providers.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
