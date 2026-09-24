from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.modules.payments.schemas import PaymentOut

BookingStatus = Literal["pending", "confirmed", "completed", "cancelled"]


class BookingCreate(BaseModel):
    provider_id: int
    service_id: int
    address: str
    scheduled_at: datetime | None = None
    notes: str | None = None


class BookingStatusUpdate(BaseModel):
    status: BookingStatus


class BookingOut(BaseModel):
    id: int
    user_id: int
    provider_id: int
    service_id: int
    status: str
    scheduled_at: datetime | None
    address: str
    notes: str | None
    price: float
    created_at: datetime
    updated_at: datetime
    payment: PaymentOut | None = None

    class Config:
        from_attributes = True
