from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BookingCreateIn(BaseModel):
    package_id: int
    vehicle_id: int
    address_id: int | None = None
    scheduled_at: datetime
    notes: str | None = Field(default=None, max_length=1000)


class BookingActionIn(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class BookingOut(BaseModel):
    id: int
    customer_id: int
    provider_id: int
    provider_name: str
    package_id: int
    package_name: str
    vehicle_id: int
    address_id: int | None
    scheduled_at: datetime
    duration_minutes: int
    price_at_booking: float
    status: str
    payment_status: str | None
    notes: str | None
    cancellation_reason: str | None
    cancelled_by_role: str | None
    created_at: datetime
    confirmed_at: datetime | None
    rejected_at: datetime | None
    started_at: datetime | None
    completed_at: datetime | None
    cancelled_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class ProviderBookingReportOut(BaseModel):
    """Booking-volume and cancellation reporting for a provider — revenue itself
    (gross/commission/net) is already reported per-booking via the settlements
    endpoints; this covers the booking-status side settlements don't (pending,
    rejected, cancelled bookings never generate a settlement row)."""

    total_bookings: int
    by_status: dict[str, int]
    cancelled_count: int
    rejected_count: int
    completed_count: int
    cancellation_rate: float = Field(description="cancelled bookings / total bookings, 0 if no bookings yet")
