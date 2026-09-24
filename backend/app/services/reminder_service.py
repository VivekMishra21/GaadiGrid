"""Pure, DB-free reminder computation — mirrors the booking/verification state
machines in staying free of any database dependency so it's trivially unit-testable.

Reminder "type" strings match the vehicle fields they're derived from
(`insurance`, `puc`, `service`); `Notification.type` values
(`REMINDER_INSURANCE`/`REMINDER_PUC`/`REMINDER_SERVICE`) are built from these by the
caller, not stored here.
"""

from dataclasses import dataclass
from datetime import date

REMINDER_THRESHOLDS = (1, 7, 15)
OVERDUE = "OVERDUE"
DUE_SOON = "DUE_SOON"
OK = "OK"

REMINDER_FIELDS = (
    ("insurance", "insurance_expiry"),
    ("puc", "puc_expiry"),
    ("service", "service_due_date"),
)


@dataclass
class VehicleReminderInput:
    id: int
    registration_number: str
    insurance_expiry: date | None
    puc_expiry: date | None
    service_due_date: date | None


def _urgency(days_remaining: int) -> str:
    if days_remaining < 0:
        return OVERDUE
    if days_remaining <= 15:
        return DUE_SOON
    return OK


def compute_reminders(vehicles: list[VehicleReminderInput], today: date) -> list[dict]:
    """Every insurance/PUC/service date across every given vehicle, as a flat,
    most-urgent-first list. A vehicle with no dates set contributes nothing."""
    reminders = []
    for vehicle in vehicles:
        for reminder_type, field_name in REMINDER_FIELDS:
            due_date = getattr(vehicle, field_name)
            if due_date is None:
                continue
            days_remaining = (due_date - today).days
            reminders.append(
                {
                    "vehicle_id": vehicle.id,
                    "registration_number": vehicle.registration_number,
                    "type": reminder_type,
                    "due_date": due_date,
                    "days_remaining": days_remaining,
                    "urgency": _urgency(days_remaining),
                }
            )

    reminders.sort(key=lambda r: r["days_remaining"])
    return reminders


def threshold_crossed(days_remaining: int) -> str | None:
    """The strictest reminder threshold `days_remaining` currently satisfies, as a
    stable string safe to embed in a notification dedup key — or None if the reminder
    isn't due soon enough to notify about yet at all."""
    if days_remaining < 0:
        return OVERDUE
    for threshold in REMINDER_THRESHOLDS:
        if days_remaining <= threshold:
            return str(threshold)
    return None
