from datetime import date, timedelta

from app.services.reminder_service import DUE_SOON, OK, OVERDUE, VehicleReminderInput, compute_reminders, threshold_crossed

TODAY = date(2026, 1, 1)


def _vehicle(id=1, reg="DL01AB1234", insurance=None, puc=None, service=None):
    return VehicleReminderInput(
        id=id, registration_number=reg, insurance_expiry=insurance, puc_expiry=puc, service_due_date=service
    )


def test_vehicle_with_no_dates_produces_no_reminders():
    assert compute_reminders([_vehicle()], TODAY) == []


def test_each_set_date_produces_one_reminder():
    vehicle = _vehicle(insurance=TODAY + timedelta(days=100), puc=TODAY + timedelta(days=50), service=TODAY + timedelta(days=10))
    reminders = compute_reminders([vehicle], TODAY)
    assert {r["type"] for r in reminders} == {"insurance", "puc", "service"}


def test_overdue_date_is_urgency_overdue():
    vehicle = _vehicle(insurance=TODAY - timedelta(days=1))
    reminders = compute_reminders([vehicle], TODAY)
    assert reminders[0]["urgency"] == OVERDUE
    assert reminders[0]["days_remaining"] == -1


def test_due_within_15_days_is_urgency_due_soon():
    vehicle = _vehicle(insurance=TODAY + timedelta(days=15))
    reminders = compute_reminders([vehicle], TODAY)
    assert reminders[0]["urgency"] == DUE_SOON


def test_due_in_16_days_is_urgency_ok():
    vehicle = _vehicle(insurance=TODAY + timedelta(days=16))
    reminders = compute_reminders([vehicle], TODAY)
    assert reminders[0]["urgency"] == OK


def test_reminders_across_vehicles_sorted_most_urgent_first():
    vehicles = [
        _vehicle(id=1, insurance=TODAY + timedelta(days=100)),
        _vehicle(id=2, insurance=TODAY - timedelta(days=5)),
        _vehicle(id=3, insurance=TODAY + timedelta(days=10)),
    ]
    reminders = compute_reminders(vehicles, TODAY)
    assert [r["vehicle_id"] for r in reminders] == [2, 3, 1]


def test_threshold_crossed_none_when_far_out():
    assert threshold_crossed(30) is None


def test_threshold_crossed_15():
    assert threshold_crossed(15) == "15"
    assert threshold_crossed(10) == "15"


def test_threshold_crossed_7():
    assert threshold_crossed(7) == "7"
    assert threshold_crossed(3) == "7"


def test_threshold_crossed_1():
    assert threshold_crossed(1) == "1"
    assert threshold_crossed(0) == "1"


def test_threshold_crossed_overdue():
    assert threshold_crossed(-1) == OVERDUE
    assert threshold_crossed(-100) == OVERDUE
