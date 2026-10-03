from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.service_record import ServiceRecord, ServiceRecordSource


def get_by_id(db: Session, record_id: int) -> ServiceRecord | None:
    return db.get(ServiceRecord, record_id)


def get_by_booking(db: Session, booking_id: int) -> ServiceRecord | None:
    return db.scalars(select(ServiceRecord).where(ServiceRecord.booking_id == booking_id)).first()


def create(db: Session, data: dict) -> ServiceRecord:
    record = ServiceRecord(**data)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update(db: Session, record: ServiceRecord, data: dict) -> ServiceRecord:
    for field, value in data.items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record


def delete(db: Session, record: ServiceRecord) -> None:
    db.delete(record)
    db.commit()


def list_for_vehicle(db: Session, vehicle_id: int, offset: int, limit: int) -> tuple[list[ServiceRecord], int]:
    total = db.scalar(select(func.count(ServiceRecord.id)).where(ServiceRecord.vehicle_id == vehicle_id))
    items = db.scalars(
        select(ServiceRecord)
        .where(ServiceRecord.vehicle_id == vehicle_id)
        .order_by(ServiceRecord.service_date.desc(), ServiceRecord.id.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return list(items), int(total or 0)


def recent_for_vehicle(db: Session, vehicle_id: int, limit: int, manual_only: bool = False) -> list[ServiceRecord]:
    query = select(ServiceRecord).where(ServiceRecord.vehicle_id == vehicle_id)
    if manual_only:
        query = query.where(ServiceRecord.source == ServiceRecordSource.MANUAL)
    return list(db.scalars(query.order_by(ServiceRecord.service_date.desc(), ServiceRecord.id.desc()).limit(limit)).all())


def odometer_readings(db: Session, vehicle_id: int) -> list[tuple[int, date, int]]:
    """Every recorded odometer reading as (record_id, date, km), oldest first."""
    rows = db.execute(
        select(ServiceRecord.id, ServiceRecord.service_date, ServiceRecord.odometer_km)
        .where(ServiceRecord.vehicle_id == vehicle_id, ServiceRecord.odometer_km.is_not(None))
        .order_by(ServiceRecord.service_date.asc(), ServiceRecord.odometer_km.asc())
    ).all()
    return [(rid, d, int(km)) for rid, d, km in rows]


def latest_odometer(db: Session, vehicle_id: int) -> tuple[int, date] | None:
    row = db.execute(
        select(ServiceRecord.odometer_km, ServiceRecord.service_date)
        .where(ServiceRecord.vehicle_id == vehicle_id, ServiceRecord.odometer_km.is_not(None))
        .order_by(ServiceRecord.service_date.desc(), ServiceRecord.odometer_km.desc())
        .limit(1)
    ).first()
    return (int(row[0]), row[1]) if row else None
