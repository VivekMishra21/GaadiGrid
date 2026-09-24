from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.push_token import PushPlatform


class PushTokenRegisterIn(BaseModel):
    token: str = Field(min_length=1, max_length=255)
    platform: str

    @field_validator("platform")
    @classmethod
    def check_platform(cls, v: str) -> str:
        if v not in PushPlatform.ALL:
            raise ValueError(f"platform must be one of {PushPlatform.ALL}")
        return v


class PushTokenUnregisterIn(BaseModel):
    token: str = Field(min_length=1, max_length=255)


class NotificationOut(BaseModel):
    id: int
    type: str
    title: str
    body: str
    data: dict | None
    read_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UnreadCountOut(BaseModel):
    unread_count: int
