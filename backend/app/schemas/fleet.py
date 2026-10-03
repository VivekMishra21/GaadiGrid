from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.fleet_account import FleetRole
from app.schemas.reminder import ReminderOut
from app.schemas.vehicle import VehicleOut


class FleetAccountCreateIn(BaseModel):
    company_name: str = Field(min_length=1, max_length=255)


class FleetMemberOut(BaseModel):
    user_id: int
    full_name: str
    role: str
    added_at: datetime


class FleetAccountOut(BaseModel):
    id: int
    company_name: str
    is_active: bool
    created_at: datetime
    vehicles: list[VehicleOut] = []
    members: list[FleetMemberOut] = []

    model_config = ConfigDict(from_attributes=True)


class FleetMemberAddIn(BaseModel):
    email: EmailStr
    role: str = FleetRole.DRIVER

    @field_validator("role")
    @classmethod
    def check_role(cls, v: str) -> str:
        if v not in FleetRole.ALL:
            raise ValueError(f"role must be one of {FleetRole.ALL}")
        return v


class FleetVehicleOverviewOut(BaseModel):
    vehicle: VehicleOut
    reminders: list[ReminderOut]
    spend_period: float
    latest_odometer_km: int | None


class FleetOverviewOut(BaseModel):
    account: FleetAccountOut
    your_role: str
    period_months: int
    total_spend_period: float
    vehicles: list[FleetVehicleOverviewOut]
    upcoming_reminders: list[ReminderOut]
