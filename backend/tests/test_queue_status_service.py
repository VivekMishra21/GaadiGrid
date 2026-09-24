from datetime import datetime, timedelta, timezone

from app.models.queue_report import QueueReportType
from app.services.queue_status_service import combine_reports

NOW = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)


def _report(report_type, minutes_ago=0, verified=False, flag_count=0):
    return {
        "report_type": report_type,
        "created_at": NOW - timedelta(minutes=minutes_ago),
        "is_verified_partner_report": verified,
        "flag_count": flag_count,
    }


def test_no_reports_yields_no_data():
    result = combine_reports([], now=NOW, expire_minutes=45, verified_weight=3.0)
    assert result.queue.value is None
    assert result.queue.confidence == 0.0
    assert result.cng.value is None


def test_single_fresh_report_is_used_as_is():
    reports = [_report(QueueReportType.WAIT_5_10, minutes_ago=0)]
    result = combine_reports(reports, now=NOW, expire_minutes=45, verified_weight=3.0)

    assert result.queue.value == QueueReportType.WAIT_5_10
    assert result.queue.label == "5-10 min wait"
    assert result.queue.report_count == 1
    assert result.queue.last_reported_minutes_ago == 0


def test_verified_partner_report_outweighs_regular_reports():
    reports = [
        _report(QueueReportType.NO_QUEUE, minutes_ago=0, verified=False),
        _report(QueueReportType.WAIT_30_PLUS, minutes_ago=0, verified=True),
    ]
    result = combine_reports(reports, now=NOW, expire_minutes=45, verified_weight=3.0)

    # weighted avg = (0*1 + 4*3) / (1+3) = 3.0 -> rounds to WAIT_20_30 (level 3), pulled
    # heavily toward the verified report's WAIT_30_PLUS (level 4) despite being outnumbered,
    # rather than landing near the midpoint (level 2, WAIT_10_20) a 1:1 average would give.
    assert result.queue.value == QueueReportType.WAIT_20_30


def test_expired_report_is_excluded_entirely():
    reports = [_report(QueueReportType.WAIT_20_30, minutes_ago=90)]
    result = combine_reports(reports, now=NOW, expire_minutes=45, verified_weight=3.0)

    assert result.queue.value is None
    assert result.queue.report_count == 0


def test_flagged_report_is_excluded():
    reports = [_report(QueueReportType.WAIT_20_30, minutes_ago=0, flag_count=2)]
    result = combine_reports(reports, now=NOW, expire_minutes=45, verified_weight=3.0)

    assert result.queue.value is None


def test_flag_threshold_boundary_one_flag_still_counts():
    reports = [_report(QueueReportType.NO_QUEUE, minutes_ago=0, flag_count=1)]
    result = combine_reports(reports, now=NOW, expire_minutes=45, verified_weight=3.0)

    assert result.queue.value == QueueReportType.NO_QUEUE


def test_queue_and_cng_groups_are_independent():
    reports = [
        _report(QueueReportType.WAIT_5_10, minutes_ago=0),
        _report(QueueReportType.CNG_GOOD_PRESSURE, minutes_ago=0),
    ]
    result = combine_reports(reports, now=NOW, expire_minutes=45, verified_weight=3.0)

    assert result.queue.value == QueueReportType.WAIT_5_10
    assert result.cng.value == QueueReportType.CNG_GOOD_PRESSURE
    assert result.queue.report_count == 1
    assert result.cng.report_count == 1


def test_older_report_has_less_influence_than_newer_one():
    reports = [
        _report(QueueReportType.NO_QUEUE, minutes_ago=40),  # almost fully decayed
        _report(QueueReportType.WAIT_30_PLUS, minutes_ago=0),  # fresh
    ]
    result = combine_reports(reports, now=NOW, expire_minutes=45, verified_weight=3.0)

    # the fresh report should dominate the decayed one
    assert result.queue.value == QueueReportType.WAIT_30_PLUS


def test_confidence_caps_at_one():
    reports = [
        _report(QueueReportType.WAIT_5_10, minutes_ago=0, verified=True),
        _report(QueueReportType.WAIT_5_10, minutes_ago=0, verified=True),
    ]
    result = combine_reports(reports, now=NOW, expire_minutes=45, verified_weight=3.0)

    assert result.queue.confidence == 1.0


def test_confidence_reflects_partial_weight():
    reports = [_report(QueueReportType.NO_QUEUE, minutes_ago=0, verified=False)]
    result = combine_reports(reports, now=NOW, expire_minutes=45, verified_weight=3.0)

    # single unverified fresh report: weight 1.0 / reference 3.0
    assert result.queue.confidence == round(1.0 / 3.0, 2)


def test_last_reported_minutes_ago_uses_freshest_report():
    reports = [
        _report(QueueReportType.NO_QUEUE, minutes_ago=30),
        _report(QueueReportType.NO_QUEUE, minutes_ago=5),
    ]
    result = combine_reports(reports, now=NOW, expire_minutes=45, verified_weight=3.0)

    assert result.queue.last_reported_minutes_ago == 5
    assert result.queue.report_count == 2
