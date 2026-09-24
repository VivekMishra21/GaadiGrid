from datetime import datetime

from pydantic import BaseModel


class PaymentOut(BaseModel):
    id: int
    booking_id: int
    provider: str
    provider_order_id: str
    provider_payment_id: str | None
    amount: float
    currency: str
    status: str
    created_at: datetime
    paid_at: datetime | None

    class Config:
        from_attributes = True


class PaymentOrderOut(BaseModel):
    payment: PaymentOut
    mode: str
    key_id: str


class PaymentVerifyIn(BaseModel):
    booking_id: int
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
