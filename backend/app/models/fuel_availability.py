from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class FuelAvailability(Base, TimestampMixin):
    """Station-operator-managed 'is this fuel sold here right now' flag — distinct
    from the crowdsourced, time-decaying signal in queue_reports (e.g. CNG pressure
    reports). This is the authoritative/official status; queue_reports is the live
    community signal layered on top of it."""

    __tablename__ = "fuel_availability"
    __table_args__ = (UniqueConstraint("station_id", "fuel_type_id", name="uq_fuel_availability_station_fuel_type"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    station_id: Mapped[int] = mapped_column(ForeignKey("fuel_stations.id"), nullable=False, index=True)
    fuel_type_id: Mapped[int] = mapped_column(ForeignKey("fuel_types.id"), nullable=False, index=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
