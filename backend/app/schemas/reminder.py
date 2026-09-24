from datetime import date

from pydantic import BaseModel


class ReminderOut(BaseModel):
    vehicle_id: int
    registration_number: str
    type: str
    due_date: date
    days_remaining: int
    urgency: str
