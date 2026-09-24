from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.review import Review


def get_by_id(db: Session, review_id: int) -> Review | None:
    return db.get(Review, review_id)


def get_by_booking(db: Session, booking_id: int) -> Review | None:
    return db.scalars(select(Review).where(Review.booking_id == booking_id)).first()


def list_for_provider(db: Session, provider_id: int, offset: int, limit: int) -> tuple[list[Review], int]:
    query = select(Review).where(Review.provider_id == provider_id)
    total = db.scalar(select(func.count(Review.id)).where(Review.provider_id == provider_id))
    items = db.scalars(query.order_by(Review.created_at.desc()).offset(offset).limit(limit)).all()
    return list(items), int(total or 0)


def get_rating_for_provider(db: Session, provider_id: int) -> tuple[float | None, int]:
    row = db.execute(
        select(func.avg(Review.rating), func.count(Review.id)).where(Review.provider_id == provider_id)
    ).one()
    avg, count = row
    return (round(float(avg), 2) if avg is not None else None), int(count or 0)


def get_ratings_for_providers(db: Session, provider_ids: list[int]) -> dict[int, tuple[float | None, int]]:
    if not provider_ids:
        return {}
    rows = db.execute(
        select(Review.provider_id, func.avg(Review.rating), func.count(Review.id))
        .where(Review.provider_id.in_(provider_ids))
        .group_by(Review.provider_id)
    ).all()
    return {provider_id: (round(float(avg), 2) if avg is not None else None, int(count or 0)) for provider_id, avg, count in rows}


def create(db: Session, data: dict) -> Review:
    review = Review(**data)
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


def add_response(db: Session, review: Review, response: str) -> Review:
    review.provider_response = response
    review.provider_responded_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(review)
    return review
