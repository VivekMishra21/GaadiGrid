import logging
from datetime import date

from sqlalchemy.orm import Session

from app.integrations.push import PushAdapter, get_push_adapter
from app.models.notification import NotificationType
from app.models.vehicle import Vehicle
from app.repositories import notification_repository, push_token_repository, vehicle_repository
from app.services import reminder_service

logger = logging.getLogger("gaadigrid.notifications")

REMINDER_TYPE_FOR_FIELD = {
    "insurance": NotificationType.REMINDER_INSURANCE,
    "puc": NotificationType.REMINDER_PUC,
    "service": NotificationType.REMINDER_SERVICE,
}

REMINDER_LABEL = {
    "insurance": "Insurance",
    "puc": "PUC certificate",
    "service": "Service",
}


def notify_user(db: Session, user_id: int, notification_type: str, title: str, body: str, data: dict | None = None) -> None:
    """Creates the in-app notification record and attempts a push to every device the
    user has registered. A push failure is logged and otherwise ignored — the in-app
    record is the source of truth, push is a best-effort nudge."""
    notification_repository.create(
        db, {"user_id": user_id, "type": notification_type, "title": title, "body": body, "data": data}
    )
    adapter: PushAdapter = get_push_adapter()
    for push_token in push_token_repository.list_for_user(db, user_id):
        adapter.send(push_token.token, title, body, data)


def run_reminder_sweep(db: Session) -> int:
    """Scans every active vehicle for insurance/PUC/service reminders crossing a
    not-yet-notified urgency threshold and creates a notification (+ best-effort push)
    for each one. Idempotent per (vehicle, reminder type, threshold): re-running the
    sweep the same day, or after a reminder has already been notified about at a given
    threshold, creates nothing new for that combination. Returns how many notifications
    were created, for the caller (a cron/worker script) to log."""
    today = date.today()
    vehicles: list[Vehicle] = vehicle_repository.list_all_active(db)
    adapter: PushAdapter = get_push_adapter()
    created = 0

    for vehicle in vehicles:
        for reminder in reminder_service.compute_reminders([vehicle], today):
            threshold = reminder_service.threshold_crossed(reminder["days_remaining"])
            if threshold is None:
                continue

            dedup_key = f"reminder:{vehicle.id}:{reminder['type']}:{threshold}"
            if notification_repository.exists_with_dedup_key(db, dedup_key):
                continue

            label = REMINDER_LABEL[reminder["type"]]
            urgency_phrase = "is overdue" if reminder["days_remaining"] < 0 else f"is due in {reminder['days_remaining']} day(s)"
            notification_repository.create(
                db,
                {
                    "user_id": vehicle.owner_id,
                    "type": REMINDER_TYPE_FOR_FIELD[reminder["type"]],
                    "title": f"{label} {urgency_phrase}",
                    "body": f"{vehicle.registration_number}: {label} due {reminder['due_date'].isoformat()}.",
                    "data": {"vehicle_id": vehicle.id, "reminder_type": reminder["type"]},
                    "dedup_key": dedup_key,
                },
            )
            created += 1

            for push_token in push_token_repository.list_for_user(db, vehicle.owner_id):
                adapter.send(push_token.token, f"{label} {urgency_phrase}", f"{vehicle.registration_number}", {"vehicle_id": vehicle.id})

    logger.info("reminder_sweep: created %d notification(s) for %d vehicle(s)", created, len(vehicles))
    return created
