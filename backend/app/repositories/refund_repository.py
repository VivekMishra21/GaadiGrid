from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.refund import Refund


def create(db: Session, data: dict) -> Refund:
    refund = Refund(**data)
    db.add(refund)
    db.commit()
    db.refresh(refund)
    return refund


def list_for_booking(db: Session, booking_id: int) -> list[Refund]:
    return list(db.scalars(select(Refund).where(Refund.booking_id == booking_id).order_by(Refund.created_at.desc())).all())


def update(db: Session, refund: Refund, data: dict) -> Refund:
    for field, value in data.items():
        setattr(refund, field, value)
    db.commit()
    db.refresh(refund)
    return refund
