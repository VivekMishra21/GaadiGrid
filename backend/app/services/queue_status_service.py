"""Combines raw, crowdsourced queue reports into a single trust- and recency-
weighted signal per station. Deliberately pure and DB-free (`combine_reports`) so
it's fully deterministic and unit-testable — `get_station_queue_status` is the only
part that touches the database, and it does nothing but gather inputs and call the
pure function.
"""

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.queue_report import QueueReport, QueueReportType
from app.models.queue_report_flag import QueueReportFlag
from app.schemas.queue_report import CombinedSignal, StationQueueStatusOut

QUEUE_LEVELS = {
    QueueReportType.NO_QUEUE: 0,
    QueueReportType.WAIT_5_10: 1,
    QueueReportType.WAIT_10_20: 2,
    QueueReportType.WAIT_20_30: 3,
    QueueReportType.WAIT_30_PLUS: 4,
}
QUEUE_LEVELS_BY_ORDINAL = {v: k for k, v in QUEUE_LEVELS.items()}

QUEUE_LABELS = {
    QueueReportType.NO_QUEUE: "No queue",
    QueueReportType.WAIT_5_10: "5-10 min wait",
    QueueReportType.WAIT_10_20: "10-20 min wait",
    QueueReportType.WAIT_20_30: "20-30 min wait",
    QueueReportType.WAIT_30_PLUS: "30+ min wait",
}

CNG_LEVELS = {
    QueueReportType.CNG_UNAVAILABLE: 0,
    QueueReportType.CNG_LOW_PRESSURE: 1,
    QueueReportType.CNG_NORMAL_PRESSURE: 2,
    QueueReportType.CNG_GOOD_PRESSURE: 3,
}
CNG_LEVELS_BY_ORDINAL = {v: k for k, v in CNG_LEVELS.items()}

CNG_LABELS = {
    QueueReportType.CNG_UNAVAILABLE: "CNG unavailable",
    QueueReportType.CNG_LOW_PRESSURE: "Low CNG pressure",
    QueueReportType.CNG_NORMAL_PRESSURE: "Normal CNG pressure",
    QueueReportType.CNG_GOOD_PRESSURE: "Good CNG pressure",
}

CONFIDENCE_REFERENCE_WEIGHT = 3.0


def _combine_group(
    reports: list[dict],
    levels: dict[str, int],
    levels_by_ordinal: dict[int, str],
    labels: dict[str, str],
    now: datetime,
    expire_minutes: int,
    verified_weight: float,
) -> CombinedSignal:
    """`reports` is a list of {report_type, created_at, is_verified_partner_report}
    dicts already filtered to one group (queue or CNG) — un-expired, unflagged."""
    if not reports:
        return CombinedSignal(value=None, label=None, last_reported_minutes_ago=None, report_count=0, confidence=0.0)

    weighted_sum = 0.0
    total_weight = 0.0
    min_age_minutes: int | None = None

    for report in reports:
        age_minutes = (now - report["created_at"]).total_seconds() / 60.0
        if age_minutes < 0:
            age_minutes = 0.0

        recency_factor = max(0.0, 1 - (age_minutes / expire_minutes))
        trust_weight = verified_weight if report["is_verified_partner_report"] else 1.0
        weight = trust_weight * recency_factor

        level = levels[report["report_type"]]
        weighted_sum += level * weight
        total_weight += weight

        rounded_age = int(age_minutes)
        if min_age_minutes is None or rounded_age < min_age_minutes:
            min_age_minutes = rounded_age

    if total_weight <= 0:
        # Every contributing report has fully decayed (age >= expire_minutes) —
        # treat exactly like "no data", never show fully-decayed info as live.
        return CombinedSignal(value=None, label=None, last_reported_minutes_ago=None, report_count=0, confidence=0.0)

    weighted_avg = weighted_sum / total_weight
    ordinal = round(weighted_avg)
    ordinal = max(min(levels_by_ordinal.keys()), min(ordinal, max(levels_by_ordinal.keys())))
    value = levels_by_ordinal[ordinal]

    confidence = min(1.0, total_weight / CONFIDENCE_REFERENCE_WEIGHT)

    return CombinedSignal(
        value=value,
        label=labels[value],
        last_reported_minutes_ago=min_age_minutes,
        report_count=len(reports),
        confidence=round(confidence, 2),
    )


def combine_reports(
    reports: list[dict],
    now: datetime,
    expire_minutes: int = None,
    verified_weight: float = None,
) -> StationQueueStatusOut:
    """Pure combination function. `reports` items: {report_type, created_at,
    is_verified_partner_report, flag_count}. Reports with flag_count >=
    settings.queue_report_flag_threshold or older than expire_minutes are excluded
    before combination."""
    expire_minutes = expire_minutes if expire_minutes is not None else settings.queue_report_expire_minutes
    verified_weight = verified_weight if verified_weight is not None else settings.queue_report_verified_partner_weight

    usable = [
        r
        for r in reports
        if r.get("flag_count", 0) < settings.queue_report_flag_threshold
        and (now - r["created_at"]).total_seconds() / 60.0 < expire_minutes
    ]

    queue_reports = [r for r in usable if r["report_type"] in QueueReportType.QUEUE_TYPES]
    cng_reports = [r for r in usable if r["report_type"] in QueueReportType.CNG_TYPES]

    queue_signal = _combine_group(queue_reports, QUEUE_LEVELS, QUEUE_LEVELS_BY_ORDINAL, QUEUE_LABELS, now, expire_minutes, verified_weight)
    cng_signal = _combine_group(cng_reports, CNG_LEVELS, CNG_LEVELS_BY_ORDINAL, CNG_LABELS, now, expire_minutes, verified_weight)

    return StationQueueStatusOut(queue=queue_signal, cng=cng_signal)


def get_station_queue_status(db: Session, station_id: int) -> StationQueueStatusOut:
    cutoff = datetime.now(timezone.utc)

    flag_counts_subquery = (
        select(QueueReportFlag.queue_report_id, func.count(QueueReportFlag.id).label("flag_count"))
        .group_by(QueueReportFlag.queue_report_id)
        .subquery()
    )

    rows = db.execute(
        select(
            QueueReport.report_type,
            QueueReport.created_at,
            QueueReport.is_verified_partner_report,
            func.coalesce(flag_counts_subquery.c.flag_count, 0).label("flag_count"),
        )
        .outerjoin(flag_counts_subquery, flag_counts_subquery.c.queue_report_id == QueueReport.id)
        .where(QueueReport.station_id == station_id)
        .order_by(QueueReport.created_at.desc())
        .limit(200)
    ).all()

    reports = [
        {
            "report_type": row.report_type,
            "created_at": row.created_at.replace(tzinfo=timezone.utc) if row.created_at.tzinfo is None else row.created_at,
            "is_verified_partner_report": row.is_verified_partner_report,
            "flag_count": row.flag_count,
        }
        for row in rows
    ]

    return combine_reports(reports, now=cutoff)
