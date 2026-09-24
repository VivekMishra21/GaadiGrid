from pydantic import BaseModel, EmailStr, Field


class UserProfileUpdateIn(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
