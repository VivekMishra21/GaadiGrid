from datetime import date, datetime

from pydantic import BaseModel

from app.schemas.reminder import ReminderOut
from app.schemas.service_record import ServiceRecordOut


class PassportIdentityOut(BaseModel):
    vehicle_id: int
    registration_number: str
    vehicle_type: str
    brand: str
    model: str
    variant: str | None
    fuel_type: str
    average_mileage: float | None
    on_gaadigrid_since: datetime


class PassportOdometerOut(BaseModel):
    km: int
    as_of: date


class PassportTotalsOut(BaseModel):
    service_records: int
    completed_bookings: int
    expenses_logged: int
    total_logged_spend: float


class VehiclePassportOut(BaseModel):
    identity: PassportIdentityOut
    latest_odometer: PassportOdometerOut | None
    totals: PassportTotalsOut
    service_history: list[ServiceRecordOut]
    reminders: list[ReminderOut]
    # What this document is, and is not.
    disclaimer: str
