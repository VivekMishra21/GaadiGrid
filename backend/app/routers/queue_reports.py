from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.middleware.rbac import get_current_user
from app.models.queue_report import QueueReport
from app.models.queue_report_flag import QueueReportFlag
from app.models.user import User
from app.repositories import station_repository
from app.schemas.queue_report import QueueReportCreateIn, QueueReportOut
from app.services.audit_service import record_audit_event
from app.services.exceptions import NotFoundError
from app.services.queue_report_service import flag_queue_report, submit_queue_report

router = APIRouter(prefix="/api/v1/stations/{station_id}/queue-reports", tags=["queue-reports"])
flags_router = APIRouter(prefix="/api/v1/queue-reports", tags=["queue-reports"])


def _to_out(report: QueueReport, flag_count: int) -> QueueReportOut:
    return QueueReportOut(
        id=report.id,
        station_id=report.station_id,
        report_type=report.report_type,
        is_verified_partner_report=report.is_verified_partner_report,
        created_at=report.created_at,
        flag_count=flag_count,
    )


@router.get("", response_model=list[QueueReportOut])
def list_recent_reports(station_id: int, db: Session = Depends(get_db)):
    station = station_repository.get_by_id(db, station_id)
    if station is None:
        raise NotFoundError("Station not found.")

    flag_counts_subquery = (
        select(QueueReportFlag.queue_report_id, func.count(QueueReportFlag.id).label("flag_count"))
        .group_by(QueueReportFlag.queue_report_id)
        .subquery()
    )

    rows = db.execute(
        select(QueueReport, func.coalesce(flag_counts_subquery.c.flag_count, 0))
        .outerjoin(flag_counts_subquery, flag_counts_subquery.c.queue_report_id == QueueReport.id)
        .where(QueueReport.station_id == station_id)
        .order_by(QueueReport.created_at.desc())
        .limit(50)
    ).all()

    return [_to_out(report, flag_count) for report, flag_count in rows]


@router.post("", response_model=QueueReportOut, status_code=201)
def create_report(
    station_id: int,
    payload: QueueReportCreateIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    station = station_repository.get_by_id(db, station_id)
    if station is None:
        raise NotFoundError("Station not found.")

    report = submit_queue_report(db, station, user, payload.report_type, payload.latitude, payload.longitude)
    record_audit_event(
        db,
        action="queue_report.create",
        actor_user_id=user.id,
        target_type="station",
        target_id=str(station_id),
        context={"report_type": payload.report_type},
    )
    return _to_out(report, 0)


@flags_router.post("/{report_id}/flag", status_code=204)
def flag_report(report_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    report = db.get(QueueReport, report_id)
    if report is None:
        raise NotFoundError("Queue report not found.")

    flag_queue_report(db, report, user)
