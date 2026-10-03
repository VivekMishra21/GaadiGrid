from datetime import date, timedelta

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


def _setup(client, phone="+919840000001", vehicle_overrides=None):
    token = signup_customer(client, phone)["access_token"]
    vehicle = create_vehicle(client, token, vehicle_overrides)
    return token, vehicle


def _complete_a_booking(client, db_session, owner_email, cust_token, vehicle):
    create_provider_owner(client, db_session, owner_email)
    owner_token = login_staff(client, owner_email)["access_token"]
    provider = create_provider(client, owner_token)
    package = create_package(client, owner_token, provider["id"])
    set_full_week_availability(client, owner_token, provider["id"])
    address = create_address(client, cust_token)
    slot = client.get(
        f"/api/v1/providers/{provider['id']}/packages/{package['id']}/available-slots",
        params={"date": (date.today() + timedelta(days=1)).isoformat()},
    ).json()[0]
    booking = client.post(
        "/api/v1/bookings",
        json={"package_id": package["id"], "vehicle_id": vehicle["id"], "address_id": address["id"], "scheduled_at": slot},
        headers=auth_header(cust_token),
    ).json()
    client.post(f"/api/v1/bookings/{booking['id']}/confirm", headers=auth_header(owner_token))
    order = client.post(f"/api/v1/bookings/{booking['id']}/payment", headers=auth_header(cust_token)).json()
    client.post(f"/api/v1/payments/{order['id']}/dev-complete", headers=auth_header(cust_token))
    client.post(f"/api/v1/bookings/{booking['id']}/start", headers=auth_header(owner_token))
    res = client.post(f"/api/v1/bookings/{booking['id']}/complete", headers=auth_header(owner_token))
    assert res.status_code == 200, res.text
    return booking, package, provider


def _records(client, token, vehicle):
    res = client.get(f"/api/v1/vehicles/{vehicle['id']}/service-records", headers=auth_header(token))
    assert res.status_code == 200, res.text
    return res.json()["items"]


def _log(client, token, vehicle, **fields):
    body = {"service_type": "GENERAL_SERVICE", "title": "Full service", "service_date": date.today().isoformat(), **fields}
    return client.post(f"/api/v1/vehicles/{vehicle['id']}/service-records", json=body, headers=auth_header(token))


def test_completed_booking_creates_one_record_and_one_linked_expense(client, db_session):
    token, vehicle = _setup(client)
    booking, package, provider = _complete_a_booking(client, db_session, "sr-owner1@test.dev", token, vehicle)

    records = _records(client, token, vehicle)
    assert len(records) == 1
    record = records[0]
    assert record["source"] == "BOOKING" and record["booking_id"] == booking["id"]
    assert record["title"] == package["name"] and record["provider_name"] == provider["business_name"]
    assert record["amount"] == package["price"] and record["expense_id"] is not None

    expenses = client.get(f"/api/v1/vehicles/{vehicle['id']}/expenses", headers=auth_header(token)).json()["items"]
    assert [e["id"] for e in expenses] == [record["expense_id"]]
    assert expenses[0]["category"] == "SERVICE" and expenses[0]["amount"] == package["price"]


def test_booking_record_is_protected_but_odometer_and_notes_are_editable(client, db_session):
    token, vehicle = _setup(client, "+919840000002")
    _complete_a_booking(client, db_session, "sr-owner2@test.dev", token, vehicle)
    record = _records(client, token, vehicle)[0]

    ok = client.put(
        f"/api/v1/service-records/{record['id']}",
        json={"odometer_km": 42100, "invoice_number": "INV-9", "work_done": "Foam wash, tyre shine"},
        headers=auth_header(token),
    )
    assert ok.status_code == 200 and ok.json()["odometer_km"] == 42100

    changed_amount = client.put(f"/api/v1/service-records/{record['id']}", json={"amount": 1.0}, headers=auth_header(token))
    assert changed_amount.status_code == 422
    assert client.delete(f"/api/v1/service-records/{record['id']}", headers=auth_header(token)).status_code == 422


def test_manual_record_owns_its_expense_through_edit_and_delete(client, db_session):
    token, vehicle = _setup(client, "+919840000003")
    created = _log(client, token, vehicle, amount=4850.0, provider_name="Local garage", odometer_km=30000, invoice_number="A-1")
    assert created.status_code == 201, created.text
    record = created.json()
    assert record["source"] == "MANUAL" and record["expense_id"] is not None

    cost = client.get(f"/api/v1/vehicles/{vehicle['id']}/cost", headers=auth_header(token)).json()
    assert cost["by_category"]["SERVICE"] == 4850.0

    edited = client.put(f"/api/v1/service-records/{record['id']}", json={"amount": 5000.0}, headers=auth_header(token))
    assert edited.status_code == 200
    cost = client.get(f"/api/v1/vehicles/{vehicle['id']}/cost", headers=auth_header(token)).json()
    assert cost["by_category"]["SERVICE"] == 5000.0

    timeline = client.get(f"/api/v1/vehicles/{vehicle['id']}/timeline", headers=auth_header(token)).json()
    assert [e["kind"] for e in timeline] == ["SERVICE_RECORD"]  # its expense is not listed again

    assert client.delete(f"/api/v1/service-records/{record['id']}", headers=auth_header(token)).status_code == 204
    cost = client.get(f"/api/v1/vehicles/{vehicle['id']}/cost", headers=auth_header(token)).json()
    assert cost["all_time_total"] == 0


def test_record_without_an_amount_adds_no_cost(client, db_session):
    token, vehicle = _setup(client, "+919840000004")
    assert _log(client, token, vehicle, odometer_km=1000).status_code == 201
    cost = client.get(f"/api/v1/vehicles/{vehicle['id']}/cost", headers=auth_header(token)).json()
    assert cost["all_time_total"] == 0


def test_odometer_can_only_go_up_and_dates_cannot_be_in_the_future(client, db_session):
    token, vehicle = _setup(client, "+919840000005")
    today = date.today()
    assert _log(client, token, vehicle, service_date=(today - timedelta(days=60)).isoformat(), odometer_km=20000).status_code == 201

    lower_later = _log(client, token, vehicle, service_date=today.isoformat(), odometer_km=19000)
    assert lower_later.status_code == 422 and "lower" in lower_later.text

    higher_earlier = _log(client, token, vehicle, service_date=(today - timedelta(days=90)).isoformat(), odometer_km=25000)
    assert higher_earlier.status_code == 422 and "higher" in higher_earlier.text

    future = _log(client, token, vehicle, service_date=(today + timedelta(days=3)).isoformat())
    assert future.status_code == 422


def test_cost_per_km_needs_two_readings_far_apart_and_uses_only_real_spend(client, db_session):
    token, vehicle = _setup(client, "+919840000006")
    today = date.today()
    first, last = today - timedelta(days=100), today - timedelta(days=10)

    _log(client, token, vehicle, service_date=first.isoformat(), odometer_km=10000, amount=3000.0)
    cost = client.get(f"/api/v1/vehicles/{vehicle['id']}/cost", headers=auth_header(token)).json()
    assert cost["cost_per_km"] is None  # one reading is not a distance

    _log(client, token, vehicle, service_date=(first + timedelta(days=5)).isoformat(), odometer_km=10050)
    assert client.get(f"/api/v1/vehicles/{vehicle['id']}/cost", headers=auth_header(token)).json()["cost_per_km"] is None  # still < 100 km

    client.post(
        f"/api/v1/vehicles/{vehicle['id']}/expenses",
        json={"category": "FUEL", "amount": 2000.0, "expense_date": (first + timedelta(days=30)).isoformat()},
        headers=auth_header(token),
    )
    _log(client, token, vehicle, service_date=last.isoformat(), odometer_km=11000, amount=1000.0)

    cost = client.get(f"/api/v1/vehicles/{vehicle['id']}/cost", headers=auth_header(token)).json()
    basis = cost["cost_per_km_basis"]
    assert basis["from_km"] == 10000 and basis["to_km"] == 11000
    # The 3,000 service on the first reading's day belongs to the period before it.
    assert basis["expense_total"] == 3000.0  # fuel 2,000 + the 1,000 service at the last reading
    assert cost["cost_per_km"] == 3.0


def test_passport_reports_only_what_is_recorded(client, db_session):
    token, vehicle = _setup(client, "+919840000007")
    empty = client.get(f"/api/v1/vehicles/{vehicle['id']}/passport", headers=auth_header(token)).json()
    assert empty["identity"]["registration_number"] == vehicle["registration_number"]
    assert empty["latest_odometer"] is None and empty["service_history"] == []
    assert empty["totals"] == {"service_records": 0, "completed_bookings": 0, "expenses_logged": 0, "total_logged_spend": 0}
    assert "not a registration certificate" in empty["disclaimer"]

    _log(client, token, vehicle, odometer_km=15500, amount=1200.0)
    full = client.get(f"/api/v1/vehicles/{vehicle['id']}/passport", headers=auth_header(token)).json()
    assert full["latest_odometer"]["km"] == 15500
    assert full["totals"]["service_records"] == 1 and full["totals"]["total_logged_spend"] == 1200.0
    assert full["service_history"][0]["title"] == "Full service"


def test_records_are_private_to_the_owner(client, db_session):
    token, vehicle = _setup(client, "+919840000008")
    record = _log(client, token, vehicle, amount=100.0).json()
    other = signup_customer(client, "+919840000009")["access_token"]

    assert client.get(f"/api/v1/vehicles/{vehicle['id']}/service-records", headers=auth_header(other)).status_code == 403
    assert client.get(f"/api/v1/vehicles/{vehicle['id']}/passport", headers=auth_header(other)).status_code == 403
    assert client.put(f"/api/v1/service-records/{record['id']}", json={"notes": "x"}, headers=auth_header(other)).status_code == 403
    assert client.delete(f"/api/v1/service-records/{record['id']}", headers=auth_header(other)).status_code == 403
