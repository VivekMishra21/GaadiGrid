from datetime import date

from sqlalchemy import Date, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class ServiceRecordSource:
    BOOKING = "BOOKING"
    MANUAL = "MANUAL"

    ALL = (BOOKING, MANUAL)


class ServiceRecord(Base, TimestampMixin):
    """One entry in a vehicle's digital service history.

    Created automatically when a GaadiGrid booking completes (`source=BOOKING`, linked
    one-to-one to the booking) or logged by the owner for work done elsewhere
    (`source=MANUAL`). When an amount is known the record is linked to a real `Expense`
    (`expense_id`) so True Vehicle Cost counts it exactly once. Invoice/photo documents
    are intentionally not modelled: no file storage is configured yet.
    """

    __tablename__ = "service_records"
    __table_args__ = (Index("ix_service_records_vehicle_id_service_date", "vehicle_id", "service_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"), nullable=False, index=True)

    booking_id: Mapped[int | None] = mapped_column(ForeignKey("bookings.id"), nullable=True, unique=True)
    expense_id: Mapped[int | None] = mapped_column(ForeignKey("expenses.id"), nullable=True, unique=True)
    source: Mapped[str] = mapped_column(String(10), nullable=False)

    service_type: Mapped[str] = mapped_column(String(30), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    provider_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    service_date: Mapped[date] = mapped_column(Date, nullable=False)
    odometer_km: Mapped[int | None] = mapped_column(Integer, nullable=True)
    amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    invoice_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    work_done: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
