from datetime import date, timedelta
from types import SimpleNamespace

from app.services import vehicle_insight_service
from tests.helpers import (
    auth_header,
    create_address,
    create_package,
    create_provider,
    create_provider_owner,
    create_vehicle,
    login_staff,
    set_full_week_availability,
    signup_customer,
)


# --- pure service ---------------------------------------------------------------


def test_months_back_crosses_the_year_boundary():
    assert vehicle_insight_service.months_back(date(2026, 2, 10), 4) == ["2025-11", "2025-12", "2026-01", "2026-02"]
    assert vehicle_insight_service.window_start(date(2026, 2, 10), 4) == date(2025, 11, 1)


def test_cost_summary_never_invents_numbers_and_keeps_empty_months():
    summary = vehicle_insight_service.build_cost_summary(
        {("2026-02", "FUEL"): 2000.0, ("2026-01", "SERVICE"): 4850.5, ("2026-02", "SERVICE"): 100.0},
        all_time_total=9000.0,
        completed_booking_spend=1200.0,
        completed_booking_count=2,
        today=date(2026, 2, 10),
        months=3,
    )
    assert [m["month"] for m in summary["by_month"]] == ["2025-12", "2026-01", "2026-02"]
    assert summary["by_month"][0]["total"] == 0.0
    assert summary["period_total"] == 6950.5
    assert summary["by_category"]["FUEL"] == 2000.0
    assert summary["average_per_month"] == round(6950.5 / 3, 2)
    assert summary["all_time_total"] == 9000.0
    # Booking spend sits beside the expense totals, never inside them.
    assert summary["completed_booking_spend"] == 1200.0
    assert summary["period_total"] != 6950.5 + 1200.0


def test_timeline_merges_newest_first_and_respects_limit():
    package = SimpleNamespace(name="Basic Wash", category="CAR_WASH")
    provider = SimpleNamespace(business_name="Sparkle")
    booking = SimpleNamespace(
        id=1, package_id=10, provider_id=20, status="COMPLETED", price_at_booking=349.0,
        completed_at=None, cancelled_at=None, rejected_at=None, scheduled_at=None,
    )
    from datetime import datetime, timezone

    booking.completed_at = datetime(2026, 2, 5, 10, 0, tzinfo=timezone.utc)
    expenses = [
        SimpleNamespace(id=7, category="FUEL", amount=2100.0, expense_date=date(2026, 2, 6), note="Full tank"),
        SimpleNamespace(id=8, category="SERVICE", amount=4850.0, expense_date=date(2026, 1, 1), note=None),
    ]
    events = vehicle_insight_service.build_timeline([booking], expenses, {10: package}, {20: provider}, limit=10)
    assert [(e["kind"], e["title"]) for e in events] == [("EXPENSE", "Fuel"), ("BOOKING", "Basic Wash"), ("EXPENSE", "Service")]
    assert events[1]["amount"] == 349.0 and events[1]["subtitle"] == "Sparkle"

    assert len(vehicle_insight_service.build_timeline([booking], expenses, {10: package}, {20: provider}, limit=2)) == 2


# --- API ------------------------------------------------------------------------


def _booking_for(client, db_session, owner_email, cust_token, vehicle):
    create_provider_owner(client, db_session, owner_email)
    owner_token = login_staff(client, owner_email)["access_token"]
    provider = create_provider(client, owner_token)
    package = create_package(client, owner_token, provider["id"])
    set_full_week_availability(client, owner_token, provider["id"])
    address = create_address(client, cust_token)
    tomorrow = date.today() + timedelta(days=1)
    slots = client.get(
        f"/api/v1/providers/{provider['id']}/packages/{package['id']}/available-slots", params={"date": tomorrow.isoformat()}
    ).json()
    booking = client.post(
        "/api/v1/bookings",
        json={"package_id": package["id"], "vehicle_id": vehicle["id"], "address_id": address["id"], "scheduled_at": slots[0]},
        headers=auth_header(cust_token),
    ).json()
    return owner_token, booking, package


def test_timeline_and_cost_reflect_only_real_records(client, db_session):
    cust = signup_customer(client, "+919830000001")
    token = cust["access_token"]
    vehicle = create_vehicle(client, token)

    # A brand-new vehicle has no history and no cost — nothing is made up.
    res = client.get(f"/api/v1/vehicles/{vehicle['id']}/timeline", headers=auth_header(token))
    assert res.status_code == 200 and res.json() == []
    cost = client.get(f"/api/v1/vehicles/{vehicle['id']}/cost", headers=auth_header(token)).json()
    assert cost["period_total"] == 0 and cost["completed_booking_count"] == 0 and len(cost["by_month"]) == 6

    today = date.today().isoformat()
    for category, amount in (("FUEL", 2100.0), ("SERVICE", 4850.0)):
        r = client.post(
            f"/api/v1/vehicles/{vehicle['id']}/expenses",
            json={"category": category, "amount": amount, "expense_date": today},
            headers=auth_header(token),
        )
        assert r.status_code == 201, r.text

    owner_token, booking, package = _booking_for(client, db_session, "vi-owner1@test.dev", token, vehicle)
    r = client.post(f"/api/v1/bookings/{booking['id']}/confirm", headers=auth_header(owner_token))
    assert r.status_code == 200, r.text
    order = client.post(f"/api/v1/bookings/{booking['id']}/payment", headers=auth_header(token)).json()
    client.post(f"/api/v1/payments/{order['id']}/dev-complete", headers=auth_header(token))
    for action in ("start", "complete"):
        r = client.post(f"/api/v1/bookings/{booking['id']}/{action}", headers=auth_header(owner_token))
        assert r.status_code == 200, r.text

    events = client.get(f"/api/v1/vehicles/{vehicle['id']}/timeline", headers=auth_header(token)).json()
    assert {e["kind"] for e in events} == {"BOOKING", "EXPENSE"}
    booking_event = next(e for e in events if e["kind"] == "BOOKING")
    assert booking_event["status"] == "COMPLETED" and booking_event["amount"] == package["price"]
    # The completed booking's own auto-created expense is not listed a second time.
    assert sum(1 for e in events if e["kind"] == "EXPENSE") == 2

    # Completing the booking logged its price as a real SERVICE expense, so it is part of the cost.
    cost = client.get(f"/api/v1/vehicles/{vehicle['id']}/cost", params={"months": 3}, headers=auth_header(token)).json()
    assert cost["period_total"] == 6950.0 + package["price"]
    assert cost["by_category"]["FUEL"] == 2100.0
    assert cost["by_category"]["SERVICE"] == 4850.0 + package["price"]
    assert cost["completed_booking_count"] == 0 and cost["completed_booking_spend"] == 0
    assert cost["cost_per_km"] is None
    assert len(cost["by_month"]) == 3


def test_vehicle_filters_on_bookings_and_reminders(client, db_session):
    cust = signup_customer(client, "+919830000002")
    token = cust["access_token"]
    car = create_vehicle(client, token, {"registration_number": "UP16AB1111", "insurance_expiry": (date.today() + timedelta(days=5)).isoformat()})
    bike = create_vehicle(client, token, {"registration_number": "UP16CD2222", "vehicle_type": "BIKE"})
    _booking_for(client, db_session, "vi-owner2@test.dev", token, car)

    mine = client.get("/api/v1/bookings/mine", headers=auth_header(token)).json()
    assert mine["meta"]["total"] == 1
    for_car = client.get("/api/v1/bookings/mine", params={"vehicle_id": car["id"]}, headers=auth_header(token)).json()
    for_bike = client.get("/api/v1/bookings/mine", params={"vehicle_id": bike["id"]}, headers=auth_header(token)).json()
    assert for_car["meta"]["total"] == 1 and for_bike["meta"]["total"] == 0

    all_reminders = client.get("/api/v1/vehicles/reminders", headers=auth_header(token)).json()
    car_reminders = client.get("/api/v1/vehicles/reminders", params={"vehicle_id": car["id"]}, headers=auth_header(token)).json()
    bike_reminders = client.get("/api/v1/vehicles/reminders", params={"vehicle_id": bike["id"]}, headers=auth_header(token)).json()
    assert len(all_reminders) == 1 and len(car_reminders) == 1 and bike_reminders == []


def test_cannot_read_another_users_vehicle_timeline_or_cost(client, db_session):
    owner = signup_customer(client, "+919830000003")
    vehicle = create_vehicle(client, owner["access_token"])
    intruder = signup_customer(client, "+919830000004")
    for path in ("timeline", "cost"):
        res = client.get(f"/api/v1/vehicles/{vehicle['id']}/{path}", headers=auth_header(intruder["access_token"]))
        assert res.status_code == 403
