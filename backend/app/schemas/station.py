from datetime import datetime, time

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.station_facility import FacilityCode
from app.schemas.fuel_price import FuelAvailabilityOut, FuelPriceOut
from app.schemas.queue_report import StationQueueStatusOut


class StationCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    brand: str = Field(min_length=1, max_length=120)
    address: str = Field(min_length=1, max_length=500)
    city: str = Field(min_length=1, max_length=120)
    locality: str | None = Field(default=None, max_length=120)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    is_24_hours: bool = True
    opens_at: time | None = None
    closes_at: time | None = None


class StationUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    brand: str | None = Field(default=None, min_length=1, max_length=120)
    address: str | None = Field(default=None, min_length=1, max_length=500)
    city: str | None = Field(default=None, min_length=1, max_length=120)
    locality: str | None = Field(default=None, max_length=120)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    is_24_hours: bool | None = None
    opens_at: time | None = None
    closes_at: time | None = None
    is_active: bool | None = None


class FacilitiesUpdateIn(BaseModel):
    facility_codes: list[str]

    @field_validator("facility_codes")
    @classmethod
    def check_codes(cls, v: list[str]) -> list[str]:
        invalid = set(v) - set(FacilityCode.ALL)
        if invalid:
            raise ValueError(f"Unknown facility codes: {sorted(invalid)}")
        return v


class StationSummaryOut(BaseModel):
    id: int
    name: str
    brand: str
    address: str
    city: str
    locality: str | None
    latitude: float
    longitude: float
    is_24_hours: bool
    opens_at: time | None
    closes_at: time | None
    distance_km: float | None = None
    is_favorite: bool = False
    prices: list[FuelPriceOut] = []
    queue_status: StationQueueStatusOut

    model_config = ConfigDict(from_attributes=True)


class StationDetailOut(StationSummaryOut):
    availability: list[FuelAvailabilityOut] = []
    facilities: list[str] = []
    created_at: datetime
