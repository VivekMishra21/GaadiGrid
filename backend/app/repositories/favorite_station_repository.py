from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.favorite_station import FavoriteStation


def list_station_ids_for_user(db: Session, user_id: int) -> set[int]:
    return set(db.scalars(select(FavoriteStation.station_id).where(FavoriteStation.user_id == user_id)).all())


def is_favorite(db: Session, user_id: int, station_id: int) -> bool:
    return (
        db.scalars(
            select(FavoriteStation.id).where(FavoriteStation.user_id == user_id, FavoriteStation.station_id == station_id)
        ).first()
        is not None
    )


def toggle(db: Session, user_id: int, station_id: int) -> bool:
    """Returns the new favorite state (True = now favorited)."""
    existing = db.scalars(
        select(FavoriteStation).where(FavoriteStation.user_id == user_id, FavoriteStation.station_id == station_id)
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return False

    db.add(FavoriteStation(user_id=user_id, station_id=station_id))
    db.commit()
    return True
