"""Scans every active vehicle for insurance/PUC/service reminders and creates
notifications for the ones crossing a not-yet-notified urgency threshold.

Not wired to any scheduler in this repository — run it on a daily cron in production
(e.g. `0 8 * * * /path/to/venv/bin/python -m app.workers.reminder_sweep`), the same way
you would `seed.py` manually today. It's idempotent, so running it more than once a day
is harmless.
"""

from app.database.session import SessionLocal
from app.services.notification_service import run_reminder_sweep


def run() -> None:
    db = SessionLocal()
    try:
        created = run_reminder_sweep(db)
        print(f"Reminder sweep complete: {created} notification(s) created.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
