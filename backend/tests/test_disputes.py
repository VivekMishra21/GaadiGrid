from datetime import date, timedelta

from app.core.constants import Role
from app.repositories import user_repository
from tests.helpers import (
    auth_header,
    create_address,
    create_package,
    create_provider,
    create_provider_owner,
    create_staff_user,
    create_vehicle,
    login_staff,
    set_full_week_availability,
    signup_customer,
)


def _admin_token(client, db_session, email="dispute-admin@test.dev"):
    existing = user_repository.get_by_email(db_session, email)
    if existing is None:
        create_staff_user(db_session, email, role=Role.ADMIN)
    return login_staff(client, email)["access_token"]


def _confirmed_booking(client, db_session, email, phone):
    create_provider_owner(client, db_session, email)
    owner_token = login_staff(client, email)["access_token"]
    provider = create_provider(client, owner_token)
    package = create_package(client, owner_token, provider["id"])
    set_full_week_availability(client, owner_token, provider["id"])

    customer = signup_customer(client, phone)
    cust_token = customer["access_token"]
    vehicle = create_vehicle(client, cust_token)
    address = create_address(client, cust_token)

    tomorrow = date.today() + timedelta(days=1)
    slot = client.get(
        f"/api/v1/providers/{provider['id']}/packages/{package['id']}/available-slots", params={"date": tomorrow.isoformat()}
    ).json()[0]

    booking = client.post(
        "/api/v1/bookings",
        json={"package_id": package["id"], "vehicle_id": vehicle["id"], "address_id": address["id"], "scheduled_at": slot},
        headers=auth_header(cust_token),
    ).json()
    client.post(f"/api/v1/bookings/{booking['id']}/confirm", headers=auth_header(owner_token))

    return owner_token, cust_token, booking


def test_customer_can_raise_a_dispute(client, db_session):
    _, cust_token, booking = _confirmed_booking(client, db_session, "dispute1@test.dev", "+919824000001")

    res = client.post(f"/api/v1/bookings/{booking['id']}/dispute", json={"reason": "Provider never showed up"}, headers=auth_header(cust_token))
    assert res.status_code == 201, res.text
    assert res.json()["status"] == "OPEN"


def test_provider_can_raise_a_dispute(client, db_session):
    owner_token, _, booking = _confirmed_booking(client, db_session, "dispute2@test.dev", "+919824000002")

    res = client.post(f"/api/v1/bookings/{booking['id']}/dispute", json={"reason": "Customer vehicle inaccessible"}, headers=auth_header(owner_token))
    assert res.status_code == 201


def test_cannot_raise_a_second_open_dispute_for_the_same_booking(client, db_session):
    _, cust_token, booking = _confirmed_booking(client, db_session, "dispute3@test.dev", "+919824000003")
    client.post(f"/api/v1/bookings/{booking['id']}/dispute", json={"reason": "First"}, headers=auth_header(cust_token))

    res = client.post(f"/api/v1/bookings/{booking['id']}/dispute", json={"reason": "Second"}, headers=auth_header(cust_token))
    assert res.status_code == 409


def test_unrelated_user_cannot_raise_or_view_disputes(client, db_session):
    _, _, booking = _confirmed_booking(client, db_session, "dispute4@test.dev", "+919824000004")
    intruder = signup_customer(client, "+919824000005")

    res = client.post(f"/api/v1/bookings/{booking['id']}/dispute", json={"reason": "x"}, headers=auth_header(intruder["access_token"]))
    assert res.status_code == 403

    res = client.get(f"/api/v1/bookings/{booking['id']}/disputes", headers=auth_header(intruder["access_token"]))
    assert res.status_code == 403


def test_admin_can_list_and_resolve_a_dispute(client, db_session):
    _, cust_token, booking = _confirmed_booking(client, db_session, "dispute5@test.dev", "+919824000006")
    dispute = client.post(f"/api/v1/bookings/{booking['id']}/dispute", json={"reason": "Damage to vehicle"}, headers=auth_header(cust_token)).json()

    admin_token = _admin_token(client, db_session)
    res = client.get("/api/v1/admin/disputes", params={"status": "OPEN"}, headers=auth_header(admin_token))
    assert res.status_code == 200
    assert res.json()["meta"]["total"] >= 1

    res = client.post(
        f"/api/v1/admin/disputes/{dispute['id']}/resolve",
        json={"status": "RESOLVED", "resolution_note": "Refund issued to customer"},
        headers=auth_header(admin_token),
    )
    assert res.status_code == 200
    resolved = res.json()
    assert resolved["status"] == "RESOLVED"
    assert resolved["resolution_note"] == "Refund issued to customer"
    assert resolved["resolved_by_user_id"] is not None


def test_cannot_resolve_an_already_closed_dispute(client, db_session):
    _, cust_token, booking = _confirmed_booking(client, db_session, "dispute6@test.dev", "+919824000007")
    dispute = client.post(f"/api/v1/bookings/{booking['id']}/dispute", json={"reason": "x"}, headers=auth_header(cust_token)).json()

    admin_token = _admin_token(client, db_session)
    client.post(f"/api/v1/admin/disputes/{dispute['id']}/resolve", json={"status": "DISMISSED", "resolution_note": "Not valid"}, headers=auth_header(admin_token))

    res = client.post(f"/api/v1/admin/disputes/{dispute['id']}/resolve", json={"status": "RESOLVED", "resolution_note": "x"}, headers=auth_header(admin_token))
    assert res.status_code == 409


def test_non_admin_cannot_resolve_disputes(client, db_session):
    _, cust_token, booking = _confirmed_booking(client, db_session, "dispute7@test.dev", "+919824000008")
    dispute = client.post(f"/api/v1/bookings/{booking['id']}/dispute", json={"reason": "x"}, headers=auth_header(cust_token)).json()

    res = client.post(
        f"/api/v1/admin/disputes/{dispute['id']}/resolve",
        json={"status": "RESOLVED", "resolution_note": "x"},
        headers=auth_header(cust_token),
    )
    assert res.status_code == 403


def test_after_resolution_a_new_dispute_can_be_raised(client, db_session):
    _, cust_token, booking = _confirmed_booking(client, db_session, "dispute8@test.dev", "+919824000009")
    dispute = client.post(f"/api/v1/bookings/{booking['id']}/dispute", json={"reason": "x"}, headers=auth_header(cust_token)).json()

    admin_token = _admin_token(client, db_session)
    client.post(f"/api/v1/admin/disputes/{dispute['id']}/resolve", json={"status": "RESOLVED", "resolution_note": "x"}, headers=auth_header(admin_token))

    res = client.post(f"/api/v1/bookings/{booking['id']}/dispute", json={"reason": "New issue"}, headers=auth_header(cust_token))
    assert res.status_code == 201
