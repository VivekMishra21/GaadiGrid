from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.queue_report import QueueReportType

ReportType = Literal[
    "NO_QUEUE",
    "WAIT_5_10",
    "WAIT_10_20",
    "WAIT_20_30",
    "WAIT_30_PLUS",
    "CNG_UNAVAILABLE",
    "CNG_LOW_PRESSURE",
    "CNG_NORMAL_PRESSURE",
    "CNG_GOOD_PRESSURE",
]


class QueueReportCreateIn(BaseModel):
    report_type: ReportType
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    @field_validator("report_type")
    @classmethod
    def check_report_type(cls, v: str) -> str:
        if v not in QueueReportType.ALL:
            raise ValueError(f"report_type must be one of {QueueReportType.ALL}")
        return v


class QueueReportOut(BaseModel):
    id: int
    station_id: int
    report_type: str
    is_verified_partner_report: bool
    created_at: datetime
    flag_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class CombinedSignal(BaseModel):
    """A single combined, trust- and recency-weighted read of either the queue
    length or the CNG status at a station. `value` is None when there is no
    unexpired, unflagged data to combine — callers must never render None as if
    it were a live 'no queue' result."""

    value: str | None
    label: str | None
    last_reported_minutes_ago: int | None
    report_count: int
    confidence: float


class StationQueueStatusOut(BaseModel):
    queue: CombinedSignal
    cng: CombinedSignal
