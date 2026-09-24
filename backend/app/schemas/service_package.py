from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.service_package import ServiceCategory


class ServicePackageCreateIn(BaseModel):
    category: str
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    price: float = Field(gt=0)
    duration_minutes: int = Field(gt=0, le=480)
    is_doorstep: bool = True

    @field_validator("category")
    @classmethod
    def check_category(cls, v: str) -> str:
        if v not in ServiceCategory.ALL:
            raise ValueError(f"category must be one of {ServiceCategory.ALL}")
        return v


class ServicePackageUpdateIn(BaseModel):
    category: str | None = None
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    price: float | None = Field(default=None, gt=0)
    duration_minutes: int | None = Field(default=None, gt=0, le=480)
    is_doorstep: bool | None = None
    is_active: bool | None = None

    @field_validator("category")
    @classmethod
    def check_category(cls, v: str | None) -> str | None:
        if v is not None and v not in ServiceCategory.ALL:
            raise ValueError(f"category must be one of {ServiceCategory.ALL}")
        return v


class ServicePackageOut(BaseModel):
    id: int
    provider_id: int
    category: str
    name: str
    description: str | None
    price: float
    duration_minutes: int
    is_doorstep: bool
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
