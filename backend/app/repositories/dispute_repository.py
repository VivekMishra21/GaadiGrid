from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.dispute import Dispute, DisputeStatus


def get_by_id(db: Session, dispute_id: int) -> Dispute | None:
    return db.get(Dispute, dispute_id)


def get_open_for_booking(db: Session, booking_id: int) -> Dispute | None:
    return db.scalars(
        select(Dispute).where(Dispute.booking_id == booking_id, Dispute.status == DisputeStatus.OPEN)
    ).first()


def list_for_booking(db: Session, booking_id: int) -> list[Dispute]:
    return list(
        db.scalars(select(Dispute).where(Dispute.booking_id == booking_id).order_by(Dispute.created_at.desc())).all()
    )


def list_all(db: Session, status: str | None, offset: int, limit: int) -> tuple[list[Dispute], int]:
    query = select(Dispute)
    count_query = select(func.count(Dispute.id))
    if status:
        query = query.where(Dispute.status == status)
        count_query = count_query.where(Dispute.status == status)

    total = db.scalar(count_query)
    items = db.scalars(query.order_by(Dispute.created_at.desc()).offset(offset).limit(limit)).all()
    return list(items), int(total or 0)


def create(db: Session, data: dict) -> Dispute:
    dispute = Dispute(**data)
    db.add(dispute)
    db.commit()
    db.refresh(dispute)
    return dispute


def resolve(db: Session, dispute: Dispute, status: str, resolution_note: str, resolved_by_user_id: int) -> Dispute:
    dispute.status = status
    dispute.resolution_note = resolution_note
    dispute.resolved_by_user_id = resolved_by_user_id
    dispute.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(dispute)
    return dispute
