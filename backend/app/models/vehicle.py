from datetime import date

from sqlalchemy import Boolean, Date, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, SoftDeleteMixin, TimestampMixin


class VehicleType:
    CAR = "CAR"
    BIKE = "BIKE"
    SCOOTER = "SCOOTER"
    AUTO_RICKSHAW = "AUTO_RICKSHAW"
    COMMERCIAL = "COMMERCIAL"

    ALL = (CAR, BIKE, SCOOTER, AUTO_RICKSHAW, COMMERCIAL)


class FuelType:
    PETROL = "PETROL"
    DIESEL = "DIESEL"
    CNG = "CNG"
    EV = "EV"
    HYBRID = "HYBRID"

    ALL = (PETROL, DIESEL, CNG, EV, HYBRID)


class Vehicle(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "vehicles"
    __table_args__ = (UniqueConstraint("owner_id", "registration_number", name="uq_vehicle_owner_registration"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    vehicle_type: Mapped[str] = mapped_column(String(20), nullable=False)
    registration_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    brand: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    variant: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fuel_type: Mapped[str] = mapped_column(String(20), nullable=False)
    average_mileage: Mapped[float | None] = mapped_column(Float, nullable=True)

    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    insurance_expiry: Mapped[date | None] = mapped_column(Date, nullable=True)
    puc_expiry: Mapped[date | None] = mapped_column(Date, nullable=True)
    service_due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
