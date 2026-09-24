from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.modules.queue_reports.models import QueueReport
from app.modules.stations.models import Station
from app.modules.stations.schemas import StationCreate, StationOut, StationUpdate
from app.modules.users.models import User

router = APIRouter(prefix="/api/stations", tags=["stations"])


def _attach_latest_queue(db: Session, station: Station) -> Station:
    latest = (
        db.query(QueueReport)
        .filter(QueueReport.station_id == station.id)
        .order_by(QueueReport.created_at.desc())
        .first()
    )
    station.latest_queue = latest
    return station


@router.get("", response_model=list[StationOut])
def list_stations(q: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Station)
    if q:
        like = f"%{q}%"
        query = query.filter((Station.name.ilike(like)) | (Station.address.ilike(like)) | (Station.brand.ilike(like)))
    stations = query.order_by(Station.name).all()
    return [_attach_latest_queue(db, s) for s in stations]


@router.get("/{station_id}", response_model=StationOut)
def get_station(station_id: int, db: Session = Depends(get_db)):
    station = db.query(Station).filter(Station.id == station_id).first()
    if station is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Station not found")
    return _attach_latest_queue(db, station)


@router.post("", response_model=StationOut, status_code=status.HTTP_201_CREATED)
def create_station(payload: StationCreate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    station = Station(**payload.model_dump())
    db.add(station)
    db.commit()
    db.refresh(station)
    return _attach_latest_queue(db, station)


@router.put("/{station_id}", response_model=StationOut)
def update_station(
    station_id: int, payload: StationUpdate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)
):
    station = db.query(Station).filter(Station.id == station_id).first()
    if station is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Station not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(station, field, value)

    db.commit()
    db.refresh(station)
    return _attach_latest_queue(db, station)


@router.delete("/{station_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_station(station_id: int, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    station = db.query(Station).filter(Station.id == station_id).first()
    if station is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Station not found")
    db.delete(station)
    db.commit()
