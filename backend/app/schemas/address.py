from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

PINCODE_LENGTH = 6


class AddressBase(BaseModel):
    label: str | None = Field(default=None, max_length=50)
    line1: str = Field(min_length=1, max_length=255)
    line2: str | None = Field(default=None, max_length=255)
    city: str = Field(min_length=1, max_length=120)
    state: str = Field(min_length=1, max_length=120)
    pincode: str
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    is_default: bool = False

    @field_validator("pincode")
    @classmethod
    def check_pincode(cls, v: str) -> str:
        if not v.isdigit() or len(v) != PINCODE_LENGTH:
            raise ValueError("Enter a valid 6-digit pincode")
        return v


class AddressCreateIn(AddressBase):
    pass


class AddressUpdateIn(BaseModel):
    label: str | None = Field(default=None, max_length=50)
    line1: str | None = Field(default=None, min_length=1, max_length=255)
    line2: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, min_length=1, max_length=120)
    state: str | None = Field(default=None, min_length=1, max_length=120)
    pincode: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    is_default: bool | None = None

    @field_validator("pincode")
    @classmethod
    def check_pincode(cls, v: str | None) -> str | None:
        if v is not None and (not v.isdigit() or len(v) != PINCODE_LENGTH):
            raise ValueError("Enter a valid 6-digit pincode")
        return v


class AddressOut(AddressBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
