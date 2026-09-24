from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.station_facility import StationFacility


def list_codes_for_station(db: Session, station_id: int) -> list[str]:
    return list(db.scalars(select(StationFacility.facility_code).where(StationFacility.station_id == station_id)).all())


def list_codes_for_stations(db: Session, station_ids: list[int]) -> dict[int, list[str]]:
    if not station_ids:
        return {}
    rows = db.execute(
        select(StationFacility.station_id, StationFacility.facility_code).where(
            StationFacility.station_id.in_(station_ids)
        )
    ).all()
    result: dict[int, list[str]] = {sid: [] for sid in station_ids}
    for station_id, code in rows:
        result[station_id].append(code)
    return result


def replace_for_station(db: Session, station_id: int, facility_codes: list[str]) -> None:
    db.query(StationFacility).filter(StationFacility.station_id == station_id).delete()
    for code in sorted(set(facility_codes)):
        db.add(StationFacility(station_id=station_id, facility_code=code))
    db.commit()
