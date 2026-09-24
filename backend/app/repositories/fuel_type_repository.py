from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.fuel_type import FuelType


def list_all(db: Session) -> list[FuelType]:
    return list(db.scalars(select(FuelType).order_by(FuelType.code)).all())


def get_by_code(db: Session, code: str) -> FuelType | None:
    return db.scalars(select(FuelType).where(FuelType.code == code)).first()
