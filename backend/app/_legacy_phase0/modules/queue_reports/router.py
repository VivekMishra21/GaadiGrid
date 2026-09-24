from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.modules.queue_reports.models import QueueReport
from app.modules.queue_reports.schemas import QueueReportCreate, QueueReportOut
from app.modules.stations.models import Station
from app.modules.users.models import User

router = APIRouter(prefix="/api/stations/{station_id}/queue-reports", tags=["queue_reports"])


@router.get("", response_model=list[QueueReportOut])
def list_queue_reports(station_id: int, db: Session = Depends(get_db)):
    station = db.query(Station).filter(Station.id == station_id).first()
    if station is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Station not found")

    return (
        db.query(QueueReport)
        .filter(QueueReport.station_id == station_id)
        .order_by(QueueReport.created_at.desc())
        .limit(50)
        .all()
    )


@router.post("", response_model=QueueReportOut, status_code=status.HTTP_201_CREATED)
def create_queue_report(
    station_id: int,
    payload: QueueReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    station = db.query(Station).filter(Station.id == station_id).first()
    if station is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Station not found")

    report = QueueReport(
        station_id=station_id,
        reported_by_id=current_user.id,
        **payload.model_dump(),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
