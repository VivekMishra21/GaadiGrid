from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class FavoriteStation(Base, TimestampMixin):
    __tablename__ = "favorite_stations"
    __table_args__ = (UniqueConstraint("user_id", "station_id", name="uq_favorite_station"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    station_id: Mapped[int] = mapped_column(ForeignKey("fuel_stations.id"), nullable=False, index=True)
