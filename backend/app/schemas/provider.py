from datetime import datetime, time

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.service_package import ServicePackageOut


class ProviderCreateIn(BaseModel):
    business_name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    phone: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=255)
    address: str = Field(min_length=1, max_length=500)
    city: str = Field(min_length=1, max_length=120)
    locality: str | None = Field(default=None, max_length=120)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class ProviderUpdateIn(BaseModel):
    business_name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    phone: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=255)
    address: str | None = Field(default=None, min_length=1, max_length=500)
    city: str | None = Field(default=None, min_length=1, max_length=120)
    locality: str | None = Field(default=None, max_length=120)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    is_active: bool | None = None


class ProviderSummaryOut(BaseModel):
    id: int
    business_name: str
    description: str | None
    address: str
    city: str
    locality: str | None
    latitude: float | None
    longitude: float | None
    verification_status: str
    is_active: bool
    average_rating: float | None = None
    review_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ProviderDetailOut(ProviderSummaryOut):
    phone: str | None
    email: str | None
    packages: list[ServicePackageOut] = []


class ProviderManagerDetailOut(ProviderDetailOut):
    """Extra fields only the provider's own manager (owner/staff) or an admin should
    see — not exposed on the public customer-facing detail response."""

    owner_user_id: int
    business_registration_number: str | None
    gst_number: str | None
    verification_notes: str | None
    verification_submitted_at: datetime | None
    verified_at: datetime | None


class VerificationSubmitIn(BaseModel):
    business_registration_number: str = Field(min_length=1, max_length=100)
    gst_number: str | None = Field(default=None, max_length=20)


class VerificationRejectIn(BaseModel):
    reason: str = Field(min_length=1, max_length=1000)


class AvailabilityDayIn(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    opens_at: time
    closes_at: time

    @model_validator(mode="after")
    def check_order(self):
        if self.closes_at <= self.opens_at:
            raise ValueError("closes_at must be after opens_at")
        return self


class AvailabilityUpdateIn(BaseModel):
    days: list[AvailabilityDayIn]

    @field_validator("days")
    @classmethod
    def check_unique_days(cls, v: list[AvailabilityDayIn]) -> list[AvailabilityDayIn]:
        seen = [d.day_of_week for d in v]
        if len(seen) != len(set(seen)):
            raise ValueError("each day_of_week may appear at most once")
        return v


class AvailabilityDayOut(BaseModel):
    day_of_week: int
    opens_at: time
    closes_at: time

    model_config = ConfigDict(from_attributes=True)
