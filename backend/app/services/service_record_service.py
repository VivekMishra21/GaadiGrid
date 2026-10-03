"""Digital service records: keeping a vehicle's history and its cost in step.

A record with an amount owns exactly one linked `Expense`, so True Vehicle Cost counts
the spend once however it was entered (completed booking or manual log).
"""

import logging
from datetime import date, datetime

from sqlalchemy.orm import Session

from app.core.timezone import IST
from app.models.booking import Booking
from app.models.expense import Expense, ExpenseCategory
from app.models.service_record import ServiceRecord, ServiceRecordSource
from app.repositories import (
    expense_repository,
    provider_repository,
    service_package_repository,
    service_record_repository,
)
from app.services.exceptions import ValidationError

logger = logging.getLogger(__name__)

# What a customer may still edit on a record that came from a booking: the facts the
# provider doesn't capture. Type, title, provider, date and amount come from the booking.
BOOKING_RECORD_EDITABLE = {"odometer_km", "invoice_number", "work_done", "notes"}


def _service_date_for(booking: Booking) -> date:
    when: datetime = booking.completed_at or booking.scheduled_at
    return when.astimezone(IST).date()


def record_completed_booking(db: Session, booking: Booking) -> ServiceRecord | None:
    """Create the service record (and its expense) for a completed booking. Idempotent:
    a booking is only ever recorded once. Never raises into the booking flow — the booking
    is already completed and committed, so a failure here is logged and can be retried."""
    try:
        existing = service_record_repository.get_by_booking(db, booking.id)
        if existing is not None:
            return existing

        package = service_package_repository.get_by_id(db, booking.package_id)
        provider = provider_repository.get_by_id(db, booking.provider_id)
        title = package.name if package else "Service booking"
        provider_name = provider.business_name if provider else None
        service_date = _service_date_for(booking)

        expense = expense_repository.create(
            db,
            booking.customer_id,
            booking.vehicle_id,
            {
                "category": ExpenseCategory.SERVICE,
                "amount": booking.price_at_booking,
                "expense_date": service_date,
                "note": f"{title} - {provider_name}"[:500] if provider_name else title[:500],
            },
        )
        return service_record_repository.create(
            db,
            {
                "owner_id": booking.customer_id,
                "vehicle_id": booking.vehicle_id,
                "booking_id": booking.id,
                "expense_id": expense.id,
                "source": ServiceRecordSource.BOOKING,
                "service_type": package.category if package else "OTHER",
                "title": title,
                "provider_name": provider_name,
                "service_date": service_date,
                "amount": booking.price_at_booking,
            },
        )
    except Exception:
        db.rollback()
        logger.exception("Could not create the service record for booking %s", booking.id)
        return None


def validate_odometer(
    db: Session, vehicle_id: int, service_date: date, odometer_km: int | None, exclude_record_id: int | None = None
) -> None:
    """An odometer only goes up: a reading can't be lower than one from an earlier date or
    higher than one from a later date. Catches typos before they corrupt cost-per-km."""
    if odometer_km is None:
        return
    for record_id, other_date, other_km in service_record_repository.odometer_readings(db, vehicle_id):
        if record_id == exclude_record_id:
            continue
        if other_date < service_date and other_km > odometer_km:
            raise ValidationError(
                f"Odometer {odometer_km} km is lower than the {other_km} km recorded on {other_date.isoformat()}."
            )
        if other_date > service_date and other_km < odometer_km:
            raise ValidationError(
                f"Odometer {odometer_km} km is higher than the {other_km} km recorded later, on {other_date.isoformat()}."
            )


def create_manual_record(db: Session, owner_id: int, vehicle_id: int, data: dict) -> ServiceRecord:
    validate_odometer(db, vehicle_id, data["service_date"], data.get("odometer_km"))
    expense_id = None
    if data.get("amount"):
        expense = expense_repository.create(
            db,
            owner_id,
            vehicle_id,
            {
                "category": ExpenseCategory.SERVICE,
                "amount": data["amount"],
                "expense_date": data["service_date"],
                "note": data["title"][:500],
            },
        )
        expense_id = expense.id
    return service_record_repository.create(
        db,
        {**data, "owner_id": owner_id, "vehicle_id": vehicle_id, "source": ServiceRecordSource.MANUAL, "expense_id": expense_id},
    )


def update_record(db: Session, record: ServiceRecord, changes: dict) -> ServiceRecord:
    # These columns are required; an explicit null means "leave it alone", not "clear it".
    for required in ("service_type", "title", "service_date"):
        if required in changes and changes[required] is None:
            del changes[required]

    if record.source == ServiceRecordSource.BOOKING:
        forbidden = set(changes) - BOOKING_RECORD_EDITABLE
        if forbidden:
            raise ValidationError(
                "This record comes from a completed booking, so only the odometer, invoice number, work done and notes can be edited."
            )

    new_date = changes.get("service_date", record.service_date)
    if "odometer_km" in changes or "service_date" in changes:
        validate_odometer(db, record.vehicle_id, new_date, changes.get("odometer_km", record.odometer_km), exclude_record_id=record.id)

    if record.source == ServiceRecordSource.MANUAL:
        _sync_manual_expense(db, record, changes)

    return service_record_repository.update(db, record, changes)


def _sync_manual_expense(db: Session, record: ServiceRecord, changes: dict) -> None:
    amount = changes.get("amount", record.amount)
    expense = db.get(Expense, record.expense_id) if record.expense_id else None

    if not amount:
        if expense is not None:
            record.expense_id = None
            db.flush()
            expense_repository.delete(db, expense)
        return

    if expense is None:
        expense = expense_repository.create(
            db,
            record.owner_id,
            record.vehicle_id,
            {
                "category": ExpenseCategory.SERVICE,
                "amount": amount,
                "expense_date": changes.get("service_date", record.service_date),
                "note": changes.get("title", record.title)[:500],
            },
        )
        changes["expense_id"] = expense.id
    else:
        expense_repository.update(
            db,
            expense,
            {
                "amount": amount,
                "expense_date": changes.get("service_date", record.service_date),
                "note": changes.get("title", record.title)[:500],
            },
        )


def delete_record(db: Session, record: ServiceRecord) -> None:
    if record.source == ServiceRecordSource.BOOKING:
        raise ValidationError("A record created from a completed booking can't be deleted.")
    expense = db.get(Expense, record.expense_id) if record.expense_id else None
    service_record_repository.delete(db, record)
    if expense is not None:
        expense_repository.delete(db, expense)
