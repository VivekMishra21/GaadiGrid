from datetime import datetime

from pydantic import BaseModel, EmailStr


class AddStaffIn(BaseModel):
    email: EmailStr


class ProviderStaffOut(BaseModel):
    user_id: int
    full_name: str
    email: str | None
    added_at: datetime
