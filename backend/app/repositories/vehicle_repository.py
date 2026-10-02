from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle


def list_by_owner(db: Session, owner_id: int) -> list[Vehicle]:
    return list(
        db.scalars(
            select(Vehicle)
            .where(Vehicle.owner_id == owner_id, Vehicle.deleted_at.is_(None))
            .order_by(Vehicle.is_default.desc(), Vehicle.created_at.asc())
        ).all()
    )


def list_all_active(db: Session) -> list[Vehicle]:
    return list(db.scalars(select(Vehicle).where(Vehicle.deleted_at.is_(None))).all())


def list_by_fleet_account(db: Session, fleet_account_id: int) -> list[Vehicle]:
    return list(
        db.scalars(
            select(Vehicle).where(Vehicle.fleet_account_id == fleet_account_id, Vehicle.deleted_at.is_(None))
        ).all()
    )


def get_by_id(db: Session, vehicle_id: int) -> Vehicle | None:
    vehicle = db.get(Vehicle, vehicle_id)
    if vehicle is not None and vehicle.deleted_at is not None:
        return None
    return vehicle


def _clear_other_defaults(db: Session, owner_id: int, except_id: int | None = None) -> None:
    query = db.query(Vehicle).filter(
        Vehicle.owner_id == owner_id, Vehicle.is_default.is_(True), Vehicle.deleted_at.is_(None)
    )
    if except_id is not None:
        query = query.filter(Vehicle.id != except_id)
    query.update({"is_default": False})


def create(db: Session, owner_id: int, data: dict) -> Vehicle:
    existing_count = (
        db.query(Vehicle).filter(Vehicle.owner_id == owner_id, Vehicle.deleted_at.is_(None)).count()
    )
    is_default = data.get("is_default", False) or existing_count == 0

    vehicle = Vehicle(owner_id=owner_id, **{**data, "is_default": is_default})
    db.add(vehicle)
    db.flush()

    if is_default:
        _clear_other_defaults(db, owner_id, except_id=vehicle.id)

    db.commit()
    db.refresh(vehicle)
    return vehicle


def update(db: Session, vehicle: Vehicle, data: dict) -> Vehicle:
    for field, value in data.items():
        setattr(vehicle, field, value)

    if data.get("is_default"):
        _clear_other_defaults(db, vehicle.owner_id, except_id=vehicle.id)

    db.commit()
    db.refresh(vehicle)
    return vehicle


def soft_delete(db: Session, vehicle: Vehicle) -> None:
    was_default = vehicle.is_default
    vehicle.deleted_at = datetime.now(timezone.utc)
    vehicle.is_default = False
    db.flush()

    if was_default:
        next_vehicle = db.scalars(
            select(Vehicle)
            .where(Vehicle.owner_id == vehicle.owner_id, Vehicle.deleted_at.is_(None))
            .order_by(Vehicle.created_at.asc())
        ).first()
        if next_vehicle is not None:
            next_vehicle.is_default = True

    db.commit()
