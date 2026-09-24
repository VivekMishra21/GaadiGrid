from datetime import datetime

from pydantic import BaseModel, Field


class FuelPriceOut(BaseModel):
    fuel_type_code: str
    fuel_type_label: str
    unit: str
    price: float
    updated_at: datetime
    age_minutes: int


class FuelPriceUpsertItem(BaseModel):
    fuel_type_code: str
    price: float = Field(gt=0)


class FuelPriceUpsertIn(BaseModel):
    prices: list[FuelPriceUpsertItem]


class FuelAvailabilityOut(BaseModel):
    fuel_type_code: str
    fuel_type_label: str
    is_available: bool
    note: str | None
    updated_at: datetime


class FuelAvailabilityUpsertItem(BaseModel):
    fuel_type_code: str
    is_available: bool
    note: str | None = None


class FuelAvailabilityUpsertIn(BaseModel):
    availability: list[FuelAvailabilityUpsertItem]
