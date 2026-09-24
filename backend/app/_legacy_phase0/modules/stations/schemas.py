from datetime import datetime

from pydantic import BaseModel

from app.modules.queue_reports.schemas import QueueReportOut


class StationCreate(BaseModel):
    name: str
    brand: str
    address: str
    latitude: float | None = None
    longitude: float | None = None
    fuel_types: str = "petrol,diesel"
    operating_hours: str = "24 hours"


class StationUpdate(BaseModel):
    name: str | None = None
    brand: str | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    fuel_types: str | None = None
    operating_hours: str | None = None


class StationOut(BaseModel):
    id: int
    name: str
    brand: str
    address: str
    latitude: float | None
    longitude: float | None
    fuel_types: str
    operating_hours: str
    created_at: datetime
    latest_queue: QueueReportOut | None = None

    class Config:
        from_attributes = True
