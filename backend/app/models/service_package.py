from sqlalchemy import Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class ServiceCategory:
    CAR_WASH = "CAR_WASH"
    DETAILING = "DETAILING"
    AC_SERVICE = "AC_SERVICE"
    DENTING_PAINTING = "DENTING_PAINTING"
    GENERAL_SERVICE = "GENERAL_SERVICE"
    TYRE_SERVICE = "TYRE_SERVICE"
    BATTERY_SERVICE = "BATTERY_SERVICE"
    OTHER = "OTHER"

    ALL = (
        CAR_WASH,
        DETAILING,
        AC_SERVICE,
        DENTING_PAINTING,
        GENERAL_SERVICE,
        TYRE_SERVICE,
        BATTERY_SERVICE,
        OTHER,
    )


class ServicePackage(Base, TimestampMixin):
    """A bookable offering from a provider. There is no hard-delete endpoint —
    packages are deactivated (`is_active=False`) instead, since past bookings hold a
    foreign key to this row and a price/duration snapshot taken at booking time."""

    __tablename__ = "service_packages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    provider_id: Mapped[int] = mapped_column(ForeignKey("providers.id"), nullable=False, index=True)

    category: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    is_doorstep: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
