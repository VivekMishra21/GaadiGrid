from datetime import datetime
from typing import Literal

from pydantic import BaseModel

QueueLevel = Literal["no_queue", "short", "medium", "long"]


class QueueReportCreate(BaseModel):
    queue_level: QueueLevel
    wait_minutes: int | None = None
    note: str | None = None


class QueueReportOut(BaseModel):
    id: int
    station_id: int
    reported_by_id: int | None
    queue_level: str
    wait_minutes: int | None
    note: str | None
    created_at: datetime

    class Config:
        from_attributes = True
