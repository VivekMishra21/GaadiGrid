from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.provider_availability import ProviderAvailability


def list_for_provider(db: Session, provider_id: int) -> list[ProviderAvailability]:
    query = select(ProviderAvailability).where(ProviderAvailability.provider_id == provider_id).order_by(
        ProviderAvailability.day_of_week.asc()
    )
    return list(db.scalars(query).all())


def get_for_day(db: Session, provider_id: int, day_of_week: int) -> ProviderAvailability | None:
    return db.scalars(
        select(ProviderAvailability).where(
            ProviderAvailability.provider_id == provider_id, ProviderAvailability.day_of_week == day_of_week
        )
    ).first()


def replace_for_provider(db: Session, provider_id: int, days: list[dict]) -> None:
    """`days` is a list of {day_of_week, opens_at, closes_at} — any day of the week
    not included is left closed (its row, if any, is removed)."""
    db.query(ProviderAvailability).filter(ProviderAvailability.provider_id == provider_id).delete()
    for day in days:
        db.add(
            ProviderAvailability(
                provider_id=provider_id,
                day_of_week=day["day_of_week"],
                opens_at=day["opens_at"],
                closes_at=day["closes_at"],
            )
        )
    db.commit()
