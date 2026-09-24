from datetime import datetime

import phonenumbers
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.constants import ConsentType


def validate_phone(value: str) -> str:
    try:
        parsed = phonenumbers.parse(value, None)
    except phonenumbers.NumberParseException:
        raise ValueError("Enter a valid phone number in international format, e.g. +919876543210")
    if not phonenumbers.is_valid_number(parsed):
        raise ValueError("Enter a valid phone number in international format, e.g. +919876543210")
    return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)


class ConsentInput(BaseModel):
    consent_type: str
    version: str = "1.0"

    @field_validator("consent_type")
    @classmethod
    def check_consent_type(cls, v: str) -> str:
        if v not in ConsentType.ALL:
            raise ValueError(f"consent_type must be one of {ConsentType.ALL}")
        return v


class OtpRequestIn(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: str) -> str:
        return validate_phone(v)


class OtpRequestOut(BaseModel):
    phone: str
    expires_in_seconds: int
    resend_cooldown_seconds: int
    dev_otp: str | None = None


class OtpVerifyIn(BaseModel):
    phone: str
    otp: str = Field(min_length=4, max_length=8)
    full_name: str | None = Field(default=None, max_length=255)
    consents: list[ConsentInput] = Field(default_factory=list)

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: str) -> str:
        return validate_phone(v)


class StaffLoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class UserOut(BaseModel):
    id: int
    role: str
    phone: str | None
    email: str | None
    full_name: str
    is_active: bool
    phone_verified_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenPairOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshIn(BaseModel):
    # Optional: a browser client omits this and relies on the httpOnly refresh-token
    # cookie set at login instead; a mobile client (no cookie jar) sends it explicitly.
    refresh_token: str | None = None


class AccessTokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LogoutIn(BaseModel):
    # Optional for the same reason as RefreshIn.refresh_token above.
    refresh_token: str | None = None


class DeleteAccountIn(BaseModel):
    reason: str | None = Field(default=None, max_length=500)
