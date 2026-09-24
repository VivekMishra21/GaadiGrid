from datetime import date, datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.timezone import IST
from app.models.booking import Booking, BookingStatus


def create(db: Session, data: dict) -> Booking:
    booking = Booking(**data)
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


def get_by_id(db: Session, booking_id: int) -> Booking | None:
    return db.get(Booking, booking_id)


def list_for_customer(db: Session, customer_id: int, offset: int, limit: int) -> tuple[list[Booking], int]:
    base = select(Booking).where(Booking.customer_id == customer_id)
    total = db.scalar(select(func.count(Booking.id)).where(Booking.customer_id == customer_id))
    items = db.scalars(base.order_by(Booking.scheduled_at.desc()).offset(offset).limit(limit)).all()
    return list(items), int(total or 0)


def list_for_provider(db: Session, provider_id: int, offset: int, limit: int) -> tuple[list[Booking], int]:
    base = select(Booking).where(Booking.provider_id == provider_id)
    total = db.scalar(select(func.count(Booking.id)).where(Booking.provider_id == provider_id))
    items = db.scalars(base.order_by(Booking.scheduled_at.desc()).offset(offset).limit(limit)).all()
    return list(items), int(total or 0)


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
