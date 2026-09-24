from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReviewCreateIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)


class ReviewResponseIn(BaseModel):
    response: str = Field(min_length=1, max_length=1000)


class ReviewOut(BaseModel):
    id: int
    booking_id: int
    customer_id: int
    provider_id: int
    rating: int
    comment: str | None
    provider_response: str | None
    provider_responded_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
