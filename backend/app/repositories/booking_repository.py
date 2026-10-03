from datetime import date, datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.timezone import IST
from app.models.booking import Booking, BookingStatus
from app.models.service_record import ServiceRecord


def create(db: Session, data: dict) -> Booking:
    booking = Booking(**data)
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


def get_by_id(db: Session, booking_id: int) -> Booking | None:
    return db.get(Booking, booking_id)


def list_for_customer(
    db: Session, customer_id: int, offset: int, limit: int, vehicle_id: int | None = None
) -> tuple[list[Booking], int]:
    conditions = [Booking.customer_id == customer_id]
    if vehicle_id is not None:
        conditions.append(Booking.vehicle_id == vehicle_id)
    total = db.scalar(select(func.count(Booking.id)).where(*conditions))
    items = db.scalars(select(Booking).where(*conditions).order_by(Booking.scheduled_at.desc()).offset(offset).limit(limit)).all()
    return list(items), int(total or 0)


def list_for_vehicle(db: Session, vehicle_id: int, limit: int) -> list[Booking]:
    return list(
        db.scalars(select(Booking).where(Booking.vehicle_id == vehicle_id).order_by(Booking.scheduled_at.desc()).limit(limit)).all()
    )


def completed_spend_for_vehicle(db: Session, vehicle_id: int) -> tuple[float, int]:
    """Total `price_at_booking` and count of this vehicle's COMPLETED bookings that have no
    service record (and so no linked expense) yet. Completed bookings normally get both
    automatically; whatever is left here is spend that isn't in the expense totals, and
    including already-linked bookings would double-count them."""
    recorded = select(ServiceRecord.booking_id).where(ServiceRecord.booking_id.is_not(None))
    total, count = db.execute(
        select(func.coalesce(func.sum(Booking.price_at_booking), 0.0), func.count(Booking.id)).where(
            Booking.vehicle_id == vehicle_id, Booking.status == BookingStatus.COMPLETED, Booking.id.notin_(recorded)
        )
    ).one()
    return float(total), int(count)


def list_for_provider(db: Session, provider_id: int, offset: int, limit: int) -> tuple[list[Booking], int]:
    base = select(Booking).where(Booking.provider_id == provider_id)
    total = db.scalar(select(func.count(Booking.id)).where(Booking.provider_id == provider_id))
    items = db.scalars(base.order_by(Booking.scheduled_at.desc()).offset(offset).limit(limit)).all()
    return list(items), int(total or 0)


def count_by_status_for_provider(db: Session, provider_id: int) -> dict[str, int]:
    """Booking counts grouped by status for one provider — the raw data behind the
    provider-facing bookings/cancellations report (booking_service.build_provider_report)."""
    rows = db.execute(
        select(Booking.status, func.count(Booking.id))
        .where(Booking.provider_id == provider_id)
        .group_by(Booking.status)
    ).all()
    return {status: int(count) for status, count in rows}


def list_active_for_provider_on_date(db: Session, provider_id: int, target_date: date) -> list[Booking]:
    """Non-terminal bookings for this provider whose scheduled_at falls on
    target_date (interpreted as an IST calendar day, matching provider availability
    and what the customer picked) — used for slot-conflict checking, not display."""
    day_start = datetime.combine(target_date, time.min, tzinfo=IST)
    day_end = datetime.combine(target_date + timedelta(days=1), time.min, tzinfo=IST)
    return list(
        db.scalars(
            select(Booking).where(
                Booking.provider_id == provider_id,
                Booking.status.notin_(BookingStatus.TERMINAL),
                Booking.scheduled_at >= day_start,
                Booking.scheduled_at < day_end,
            )
        ).all()
    )


def completed_count_for_vehicle(db: Session, vehicle_id: int) -> tuple[float, int]:
    """(total price, count) of every COMPLETED booking for this vehicle, recorded or not."""
    total, count = db.execute(
        select(func.coalesce(func.sum(Booking.price_at_booking), 0.0), func.count(Booking.id)).where(
            Booking.vehicle_id == vehicle_id, Booking.status == BookingStatus.COMPLETED
        )
    ).one()
    return float(total), int(count)
