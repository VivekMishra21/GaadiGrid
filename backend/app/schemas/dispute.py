from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DisputeCreateIn(BaseModel):
    reason: str = Field(min_length=1, max_length=1000)


class DisputeResolveIn(BaseModel):
    status: str
    resolution_note: str = Field(min_length=1, max_length=1000)


class DisputeOut(BaseModel):
    id: int
    booking_id: int
    raised_by_user_id: int
    reason: str
    status: str
    resolution_note: str | None
    resolved_by_user_id: int | None
    resolved_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
