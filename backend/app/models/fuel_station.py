from datetime import time

from geoalchemy2 import Geography
from sqlalchemy import Boolean, Float, Index, Integer, String, Time
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, SoftDeleteMixin, TimestampMixin


class FuelStation(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "fuel_stations"
    __table_args__ = (Index("idx_fuel_stations_location", "location", postgresql_using="gist"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    brand: Mapped[str] = mapped_column(String(120), nullable=False)
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    city: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    locality: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)

    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    # Geography point mirrors latitude/longitude above and is what spatial queries
    # (ST_DWithin / ST_Distance / nearest-station ordering) actually run against —
    # a GIST index on this column is what makes "stations near me" fast at scale.
    # spatial_index=False: we declare that index explicitly below instead of letting
    # GeoAlchemy2 auto-create one, so Alembic's migration history stays the single
    # source of truth for schema (GeoAlchemy2's auto-index isn't Alembic-tracked).
    location = mapped_column(Geography(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False)

    is_24_hours: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    opens_at: Mapped[time | None] = mapped_column(Time, nullable=True)
    closes_at: Mapped[time | None] = mapped_column(Time, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
