import re
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.vehicle import FuelType, VehicleType

REGISTRATION_PATTERN = re.compile(r"^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$")


def normalize_registration(value: str) -> str:
    cleaned = value.upper().replace(" ", "").replace("-", "")
    if not REGISTRATION_PATTERN.match(cleaned):
        raise ValueError("Enter a valid vehicle registration number, e.g. DL01AB1234")
    return cleaned


class VehicleBase(BaseModel):
    vehicle_type: str
    registration_number: str
    brand: str = Field(min_length=1, max_length=100)
    model: str = Field(min_length=1, max_length=100)
    variant: str | None = None
    fuel_type: str
    average_mileage: float | None = Field(default=None, gt=0, le=300)
    is_default: bool = False
    insurance_expiry: date | None = None
    puc_expiry: date | None = None
    service_due_date: date | None = None

    @field_validator("vehicle_type")
    @classmethod
    def check_vehicle_type(cls, v: str) -> str:
        if v not in VehicleType.ALL:
            raise ValueError(f"vehicle_type must be one of {VehicleType.ALL}")
        return v

    @field_validator("fuel_type")
    @classmethod
    def check_fuel_type(cls, v: str) -> str:
        if v not in FuelType.ALL:
            raise ValueError(f"fuel_type must be one of {FuelType.ALL}")
        return v

    @field_validator("registration_number")
    @classmethod
    def check_registration(cls, v: str) -> str:
        return normalize_registration(v)


class VehicleCreateIn(VehicleBase):
    pass


class VehicleUpdateIn(BaseModel):
    vehicle_type: str | None = None
    registration_number: str | None = None
    brand: str | None = Field(default=None, min_length=1, max_length=100)
    model: str | None = Field(default=None, min_length=1, max_length=100)
    variant: str | None = None
    fuel_type: str | None = None
    average_mileage: float | None = Field(default=None, gt=0, le=300)
    is_default: bool | None = None
    insurance_expiry: date | None = None
    puc_expiry: date | None = None
    service_due_date: date | None = None

    @field_validator("vehicle_type")
    @classmethod
    def check_vehicle_type(cls, v: str | None) -> str | None:
        if v is not None and v not in VehicleType.ALL:
            raise ValueError(f"vehicle_type must be one of {VehicleType.ALL}")
        return v

    @field_validator("fuel_type")
    @classmethod
    def check_fuel_type(cls, v: str | None) -> str | None:
        if v is not None and v not in FuelType.ALL:
            raise ValueError(f"fuel_type must be one of {FuelType.ALL}")
        return v

    @field_validator("registration_number")
    @classmethod
    def check_registration(cls, v: str | None) -> str | None:
        return normalize_registration(v) if v is not None else None


class VehicleOut(VehicleBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
