from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.fuel_availability import FuelAvailability
from app.models.fuel_type import FuelType


def list_for_station(db: Session, station_id: int) -> list[tuple[FuelAvailability, FuelType]]:
    rows = db.execute(
        select(FuelAvailability, FuelType)
        .join(FuelType, FuelType.id == FuelAvailability.fuel_type_id)
        .where(FuelAvailability.station_id == station_id)
        .order_by(FuelType.code)
    ).all()
    return [(row[0], row[1]) for row in rows]


def upsert(db: Session, station_id: int, fuel_type_id: int, is_available: bool, note: str | None) -> FuelAvailability:
    existing = db.scalars(
        select(FuelAvailability).where(
            FuelAvailability.station_id == station_id, FuelAvailability.fuel_type_id == fuel_type_id
        )
    ).first()

    if existing:
        existing.is_available = is_available
        existing.note = note
    else:
        existing = FuelAvailability(station_id=station_id, fuel_type_id=fuel_type_id, is_available=is_available, note=note)
        db.add(existing)

    db.commit()
    db.refresh(existing)
    return existing
