from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.settlement import Settlement


def create(db: Session, data: dict) -> Settlement:
    settlement = Settlement(**data)
    db.add(settlement)
    db.commit()
    db.refresh(settlement)
    return settlement


def get_by_id(db: Session, settlement_id: int) -> Settlement | None:
    return db.get(Settlement, settlement_id)


def get_by_booking(db: Session, booking_id: int) -> Settlement | None:
    return db.scalars(select(Settlement).where(Settlement.booking_id == booking_id)).first()


def list_for_provider(db: Session, provider_id: int, offset: int, limit: int) -> tuple[list[Settlement], int]:
    base = select(Settlement).where(Settlement.provider_id == provider_id)
    total = db.scalar(select(func.count(Settlement.id)).where(Settlement.provider_id == provider_id))
    items = db.scalars(base.order_by(Settlement.created_at.desc()).offset(offset).limit(limit)).all()
    return list(items), int(total or 0)


def list_all(db: Session, status: str | None, offset: int, limit: int) -> tuple[list[Settlement], int]:
    query = select(Settlement)
    count_query = select(func.count(Settlement.id))
    if status:
        query = query.where(Settlement.status == status)
        count_query = count_query.where(Settlement.status == status)

    total = db.scalar(count_query)
    items = db.scalars(query.order_by(Settlement.created_at.desc()).offset(offset).limit(limit)).all()
    return list(items), int(total or 0)


def update(db: Session, settlement: Settlement, data: dict) -> Settlement:
    for field, value in data.items():
        setattr(settlement, field, value)
    db.commit()
    db.refresh(settlement)
    return settlement
