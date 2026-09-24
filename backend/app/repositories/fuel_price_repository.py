from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.fuel_price import FuelPrice
from app.models.fuel_type import FuelType


def list_for_station(db: Session, station_id: int) -> list[tuple[FuelPrice, FuelType]]:
    rows = db.execute(
        select(FuelPrice, FuelType)
        .join(FuelType, FuelType.id == FuelPrice.fuel_type_id)
        .where(FuelPrice.station_id == station_id)
        .order_by(FuelType.code)
    ).all()
    return [(row[0], row[1]) for row in rows]


def list_for_stations(db: Session, station_ids: list[int]) -> dict[int, list[tuple[FuelPrice, FuelType]]]:
    if not station_ids:
        return {}
    rows = db.execute(
        select(FuelPrice, FuelType)
        .join(FuelType, FuelType.id == FuelPrice.fuel_type_id)
        .where(FuelPrice.station_id.in_(station_ids))
        .order_by(FuelType.code)
    ).all()
    result: dict[int, list[tuple[FuelPrice, FuelType]]] = {sid: [] for sid in station_ids}
    for price, fuel_type in rows:
        result[price.station_id].append((price, fuel_type))
    return result


def upsert(db: Session, station_id: int, fuel_type_id: int, price: float) -> FuelPrice:
    existing = db.scalars(
        select(FuelPrice).where(FuelPrice.station_id == station_id, FuelPrice.fuel_type_id == fuel_type_id)
    ).first()

    if existing:
        existing.price = price
    else:
        existing = FuelPrice(station_id=station_id, fuel_type_id=fuel_type_id, price=price)
        db.add(existing)

    db.commit()
    db.refresh(existing)
    return existing
