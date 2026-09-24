from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PaymentOrderOut(BaseModel):
    id: int
    booking_id: int
    gateway: str
    gateway_order_id: str
    amount: float
    currency: str
    status: str
    created_at: datetime
    paid_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class RefundOut(BaseModel):
    id: int
    payment_order_id: int
    booking_id: int
    amount: float
    reason: str | None
    initiated_by_role: str
    status: str
    created_at: datetime
    processed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
