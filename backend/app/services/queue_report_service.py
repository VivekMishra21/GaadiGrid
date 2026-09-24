from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.constants import Role
from app.core.redis_client import get_redis
from app.models.fuel_station import FuelStation
from app.models.queue_report import QueueReport
from app.models.queue_report_flag import QueueReportFlag
from app.models.user import User
from app.services.exceptions import ConflictError, ForbiddenError, ValidationError
from app.services.geo_service import haversine_km


def _cooldown_key(user_id: int, station_id: int) -> str:
    return f"queue_report:cooldown:{user_id}:{station_id}"


def submit_queue_report(
    db: Session,
    station: FuelStation,
    user: User,
    report_type: str,
    latitude: float | None,
    longitude: float | None,
) -> QueueReport:
    r = get_redis()
    key = _cooldown_key(user.id, station.id)
    if r.exists(key):
        ttl = r.ttl(key)
        raise ConflictError(f"You already reported this station recently. Try again in {ttl}s.")

    if latitude is not None and longitude is not None:
        distance = haversine_km(latitude, longitude, station.latitude, station.longitude)
        if distance > settings.queue_report_max_distance_km:
            raise ValidationError(
                f"You appear to be {distance:.1f} km from this station — reports must be submitted from nearby."
            )

    report = QueueReport(
        station_id=station.id,
        reported_by_id=user.id,
        report_type=report_type,
        reporter_latitude=latitude,
        reporter_longitude=longitude,
        is_verified_partner_report=user.role in Role.PROVIDER_ROLES,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    r.setex(key, settings.queue_report_cooldown_seconds, "1")

    return report


def flag_queue_report(db: Session, report: QueueReport, user: User) -> None:
    if report.reported_by_id == user.id:
        raise ForbiddenError("You cannot flag your own report.")

    existing = (
        db.query(QueueReportFlag)
        .filter(QueueReportFlag.queue_report_id == report.id, QueueReportFlag.flagged_by_id == user.id)
        .first()
    )
    if existing:
        raise ConflictError("You already flagged this report.")

    db.add(QueueReportFlag(queue_report_id=report.id, flagged_by_id=user.id))
    db.commit()
