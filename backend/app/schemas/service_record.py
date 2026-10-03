from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.service_package import ServiceCategory

MAX_ODOMETER_KM = 2_000_000


def _check_type(v: str | None) -> str | None:
    if v is not None and v not in ServiceCategory.ALL:
        raise ValueError(f"service_type must be one of {ServiceCategory.ALL}")
    return v


def _check_not_future(v: date | None) -> date | None:
    if v is not None and v > date.today():
        raise ValueError("service_date can't be in the future.")
    return v


class ServiceRecordCreateIn(BaseModel):
    service_type: str
    title: str = Field(min_length=1, max_length=255)
    provider_name: str | None = Field(default=None, max_length=255)
    service_date: date
    odometer_km: int | None = Field(default=None, gt=0, le=MAX_ODOMETER_KM)
    amount: float | None = Field(default=None, gt=0, le=10_000_000)
    invoice_number: str | None = Field(default=None, max_length=100)
    work_done: str | None = Field(default=None, max_length=1000)
    notes: str | None = Field(default=None, max_length=1000)

    _type = field_validator("service_type")(_check_type)
    _date = field_validator("service_date")(_check_not_future)


class ServiceRecordUpdateIn(BaseModel):
    service_type: str | None = None
    title: str | None = Field(default=None, min_length=1, max_length=255)
    provider_name: str | None = Field(default=None, max_length=255)
    service_date: date | None = None
    odometer_km: int | None = Field(default=None, gt=0, le=MAX_ODOMETER_KM)
    amount: float | None = Field(default=None, gt=0, le=10_000_000)
    invoice_number: str | None = Field(default=None, max_length=100)
    work_done: str | None = Field(default=None, max_length=1000)
    notes: str | None = Field(default=None, max_length=1000)

    _type = field_validator("service_type")(_check_type)
    _date = field_validator("service_date")(_check_not_future)


class ServiceRecordOut(BaseModel):
    id: int
    vehicle_id: int
    booking_id: int | None
    expense_id: int | None
    source: str
    service_type: str
    title: str
    provider_name: str | None
    service_date: date
    odometer_km: int | None
    amount: float | None
    invoice_number: str | None
    work_done: str | None
    notes: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
