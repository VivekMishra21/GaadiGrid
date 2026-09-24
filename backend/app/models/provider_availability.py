from datetime import time

from sqlalchemy import ForeignKey, Integer, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class ProviderAvailability(Base, TimestampMixin):
    """One row per weekday the provider is open. `day_of_week` follows Python's
    `date.weekday()` convention (Monday=0 .. Sunday=6). A day with no row means the
    provider is closed that day — there is no separate `is_closed` flag."""

    __tablename__ = "provider_availability"
    __table_args__ = (UniqueConstraint("provider_id", "day_of_week", name="uq_provider_availability_day"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    provider_id: Mapped[int] = mapped_column(ForeignKey("providers.id"), nullable=False, index=True)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)
    opens_at: Mapped[time] = mapped_column(Time, nullable=False)
    closes_at: Mapped[time] = mapped_column(Time, nullable=False)
