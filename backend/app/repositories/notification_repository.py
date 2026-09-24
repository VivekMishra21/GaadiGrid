from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.notification import Notification


def exists_with_dedup_key(db: Session, dedup_key: str) -> bool:
    return db.scalar(select(func.count(Notification.id)).where(Notification.dedup_key == dedup_key)) > 0


def create(db: Session, data: dict) -> Notification:
    notification = Notification(**data)
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def get_by_id(db: Session, notification_id: int) -> Notification | None:
    return db.get(Notification, notification_id)


def list_for_user(
    db: Session, user_id: int, unread_only: bool, offset: int, limit: int
) -> tuple[list[Notification], int]:
    query = select(Notification).where(Notification.user_id == user_id)
    count_query = select(func.count(Notification.id)).where(Notification.user_id == user_id)
    if unread_only:
        query = query.where(Notification.read_at.is_(None))
        count_query = count_query.where(Notification.read_at.is_(None))

    total = db.scalar(count_query)
    items = db.scalars(query.order_by(Notification.created_at.desc()).offset(offset).limit(limit)).all()
    return list(items), int(total or 0)


def unread_count(db: Session, user_id: int) -> int:
    return int(
        db.scalar(
            select(func.count(Notification.id)).where(Notification.user_id == user_id, Notification.read_at.is_(None))
        )
        or 0
    )


def mark_read(db: Session, notification: Notification) -> Notification:
    if notification.read_at is None:
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notification)
    return notification


def mark_all_read(db: Session, user_id: int) -> None:
    db.query(Notification).filter(Notification.user_id == user_id, Notification.read_at.is_(None)).update(
        {"read_at": datetime.now(timezone.utc)}
    )
    db.commit()
