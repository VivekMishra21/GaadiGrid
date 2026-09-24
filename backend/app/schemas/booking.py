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
