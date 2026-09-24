from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SettlementOut(BaseModel):
    id: int
    provider_id: int
    booking_id: int
    gross_amount: float
    commission_rate: float
    commission_amount: float
    net_payable_amount: float
    status: str
    created_at: datetime
    paid_out_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
