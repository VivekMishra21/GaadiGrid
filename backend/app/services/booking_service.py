from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.timezone import IST
from app.models.address import Address
from app.models.booking import Booking, BookingStatus
from app.models.provider import Provider
from app.models.service_package import ServicePackage
from app.models.user import User
from app.models.vehicle import Vehicle
from app.repositories import booking_repository, payment_order_repository, provider_availability_repository
from app.services import payment_service, settlement_service
from app.services.booking_state_machine import TIMESTAMP_FIELD_FOR_STATUS, BookingActor, can_transition
from app.services.exceptions import ConflictError, NotFoundError, ValidationError
from app.services.slot_service import compute_available_slots


def _to_naive_ist(dt: datetime) -> datetime:
    """slot_service works in a naive "local wall-clock" frame (see its docstring);
    this is the one place that frame is pinned to real IST, converting a UTC-aware
    instant to the naive IST wall-clock time it corresponds to."""
    aware = dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)
    return aware.astimezone(IST).replace(tzinfo=None)


def get_available_slots(
    db: Session, provider: Provider, package: ServicePackage, target_date: date, now: datetime
) -> list[datetime]:
    availability = provider_availability_repository.get_for_day(db, provider.id, target_date.weekday())
    if availability is None:
        return []

    existing = booking_repository.list_active_for_provider_on_date(db, provider.id, target_date)
    existing_ranges = [
        (_to_naive_ist(b.scheduled_at), _to_naive_ist(b.scheduled_at) + timedelta(minutes=b.duration_minutes))
        for b in existing
    ]

    naive_slots = compute_available_slots(
        target_date,
        availability.opens_at,
        availability.closes_at,
        package.duration_minutes,
        existing_ranges,
        _to_naive_ist(now),
    )
    return [s.replace(tzinfo=IST).astimezone(timezone.utc) for s in naive_slots]


def create_booking(
    db: Session,
    customer: User,
    package: ServicePackage,
    provider: Provider,
    vehicle: Vehicle,
    address: Address | None,
    scheduled_at: datetime,
    notes: str | None,
) -> Booking:
    if not provider.is_active or provider.deleted_at is not None:
        raise NotFoundError("Provider not found.")
    if not package.is_active:
        raise ValidationError("This service package is no longer available.")
    if package.is_doorstep and address is None:
        raise ValidationError("An address is required for a doorstep service.")

    now = datetime.now(timezone.utc)
    if scheduled_at <= now:
        raise ValidationError("You cannot book a slot in the past.")

    target_date = scheduled_at.astimezone(IST).date()
    available = get_available_slots(db, provider, package, target_date, now)
    if scheduled_at not in set(available):
        raise ConflictError("That slot is no longer available. Please pick another time.")

    return booking_repository.create(
        db,
        {
            "customer_id": customer.id,
            "provider_id": provider.id,
            "package_id": package.id,
            "vehicle_id": vehicle.id,
            "address_id": address.id if address else None,
            "scheduled_at": scheduled_at,
            "duration_minutes": package.duration_minutes,
            "price_at_booking": package.price,
            "status": BookingStatus.PENDING,
            "notes": notes,
        },
    )


def transition(db: Session, booking: Booking, new_status: str, actor: str, reason: str | None = None) -> Booking:
    if not can_transition(booking.status, new_status, actor):
        raise ConflictError(f"Cannot move a {booking.status} booking to {new_status}.")

    if new_status == BookingStatus.IN_PROGRESS and payment_order_repository.get_paid_for_booking(db, booking.id) is None:
        raise ValidationError("This booking must be paid before the service can start.")

    booking.status = new_status
    field = TIMESTAMP_FIELD_FOR_STATUS.get(new_status)
    if field:
        setattr(booking, field, datetime.now(timezone.utc))

    if new_status == BookingStatus.CANCELLED:
        booking.cancelled_by_role = "CUSTOMER" if actor == BookingActor.CUSTOMER else "PROVIDER_OWNER"
        booking.cancellation_reason = reason
    elif new_status == BookingStatus.REJECTED:
        booking.cancellation_reason = reason

    db.commit()
    db.refresh(booking)

    if new_status == BookingStatus.CANCELLED:
        initiated_by = "CUSTOMER" if actor == BookingActor.CUSTOMER else "PROVIDER"
        payment_service.issue_refund(db, booking, initiated_by, reason or "Booking cancelled")
    elif new_status == BookingStatus.COMPLETED:
        settlement_service.create_settlement_for_booking(db, booking)

    return booking
