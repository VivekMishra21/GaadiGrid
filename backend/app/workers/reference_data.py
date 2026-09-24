"""Reference/lookup data that must exist in every environment, including
production — this is not sample or fake data, it's the fixed fuel-type catalog the
rest of the schema references by foreign key. Safe to call on every app startup;
it only inserts rows that don't already exist."""

from sqlalchemy.orm import Session

from app.models.fuel_type import FuelType

FUEL_TYPES = [
    {"code": "PETROL", "label": "Petrol", "unit": "litre"},
    {"code": "DIESEL", "label": "Diesel", "unit": "litre"},
    {"code": "CNG", "label": "CNG", "unit": "kg"},
    {"code": "EV", "label": "EV Charging", "unit": "kWh"},
]


def ensure_fuel_types(db: Session) -> None:
    existing_codes = {ft.code for ft in db.query(FuelType.code).all()}
    for spec in FUEL_TYPES:
        if spec["code"] not in existing_codes:
            db.add(FuelType(**spec))
    db.commit()
