from sqlalchemy import Float, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class FuelPrice(Base, TimestampMixin):
    """One row per (station, fuel_type) holding the *current* price. `updated_at`
    (from TimestampMixin) is the last-updated timestamp shown to users — this is
    deliberately not an append-only history table; see Phase 2 docs for why."""

    __tablename__ = "fuel_prices"
    __table_args__ = (UniqueConstraint("station_id", "fuel_type_id", name="uq_fuel_price_station_fuel_type"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    station_id: Mapped[int] = mapped_column(ForeignKey("fuel_stations.id"), nullable=False, index=True)
    fuel_type_id: Mapped[int] = mapped_column(ForeignKey("fuel_types.id"), nullable=False, index=True)
    price: Mapped[float] = mapped_column(Float, nullable=False)
