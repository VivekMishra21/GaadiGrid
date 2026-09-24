from datetime import datetime

from pydantic import BaseModel

from app.modules.services.schemas import ServiceOut


class ProviderCreate(BaseModel):
    name: str
    description: str | None = None
    phone: str
    address: str
    station_id: int | None = None
    is_active: bool = True


class ProviderUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    phone: str | None = None
    address: str | None = None
    station_id: int | None = None
    is_active: bool | None = None


class ProviderOut(BaseModel):
    id: int
    name: str
    description: str | None
    phone: str
    address: str
    station_id: int | None
    is_active: bool
    created_at: datetime
    services: list[ServiceOut] = []

    class Config:
        from_attributes = True
