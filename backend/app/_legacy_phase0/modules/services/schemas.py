from datetime import datetime
from typing import Literal

from pydantic import BaseModel

ServiceCategory = Literal["fuel", "clean", "care"]


class ServiceCreate(BaseModel):
    name: str
    category: ServiceCategory = "clean"
    description: str | None = None
    price: float
    duration_minutes: int = 30


class ServiceUpdate(BaseModel):
    name: str | None = None
    category: ServiceCategory | None = None
    description: str | None = None
    price: float | None = None
    duration_minutes: int | None = None


class ServiceOut(BaseModel):
    id: int
    provider_id: int
    name: str
    category: str
    description: str | None
    price: float
    duration_minutes: int
    created_at: datetime

    class Config:
        from_attributes = True
