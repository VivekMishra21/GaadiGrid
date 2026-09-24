from datetime import date, timedelta

from app.core.constants import Role
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


def _first_slot(client, provider_id, package_id):
    tomorrow = date.today() + timedelta(days=1)
    res = client.get(f"/api/v1/providers/{provider_id}/packages/{package_id}/available-slots", params={"date": tomorrow.isoformat()})
    slots = res.json()
    assert slots, "expected at least one available slot"
    return slots[0]


def _confirmed_booking(client, db_session, email, package_overrides=None):
    """Returns (owner_token, customer_token, booking) for a freshly-created,
    provider-confirmed booking ready for payment."""
    create_provider_owner(client, db_session, email)
    owner_token = login_staff(client, email)["access_token"]
    provider = create_provider(client, owner_token)
    package = create_package(client, owner_token, provider["id"], package_overrides)
    set_full_week_availability(client, owner_token, provider["id"])

    phone = f"+9198{abs(hash(email)) % 100000000:08d}"
    customer = signup_customer(client, phone)
    cust_token = customer["access_token"]
    vehicle = create_vehicle(client, cust_token)
    address = create_address(client, cust_token)
    slot = _first_slot(client, provider["id"], package["id"])

    booking = client.post(
        "/api/v1/bookings",
        json={"package_id": package["id"], "vehicle_id": vehicle["id"], "address_id": address["id"], "scheduled_at": slot},
        headers=auth_header(cust_token),
    ).json()

    client.post(f"/api/v1/bookings/{booking['id']}/confirm", headers=auth_header(owner_token))

    return owner_token, cust_token, booking


def test_payment_order_can_only_be_created_for_a_confirmed_booking(client, db_session):
    create_provider_owner(client, db_session, "pay-owner1@test.dev")
    owner_token = login_staff(client, "pay-owner1@test.dev")["access_token"]
    provider = create_provider(client, owner_token)
    package = create_package(client, owner_token, provider["id"])
    set_full_week_availability(client, owner_token, provider["id"])

    customer = signup_customer(client, "+919810000101")
    vehicle = create_vehicle(client, customer["access_token"])
    address = create_address(client, customer["access_token"])
    slot = _first_slot(client, provider["id"], package["id"])

    booking = client.post(
        "/api/v1/bookings",
        json={"package_id": package["id"], "vehicle_id": vehicle["id"], "address_id": address["id"], "scheduled_at": slot},
        headers=auth_header(customer["access_token"]),
    ).json()

    res = client.post(f"/api/v1/bookings/{booking['id']}/payment", headers=auth_header(customer["access_token"]))
    assert res.status_code == 422


def test_booking_payment_status_reflects_the_latest_payment_order(client, db_session):
    owner_token, cust_token, booking = _confirmed_booking(client, db_session, "pay-owner17@test.dev")
    assert booking["payment_status"] is None

    order = client.post(f"/api/v1/bookings/{booking['id']}/payment", headers=auth_header(cust_token)).json()
    refreshed = client.get(f"/api/v1/bookings/{booking['id']}", headers=auth_header(cust_token)).json()
    assert refreshed["payment_status"] == "CREATED"

    client.post(f"/api/v1/payments/{order['id']}/dev-complete", headers=auth_header(cust_token))
    refreshed = client.get(f"/api/v1/bookings/{booking['id']}", headers=auth_header(cust_token)).json()
    assert refreshed["payment_status"] == "PAID"


def test_only_the_booking_customer_can_create_a_payment_order(client, db_session):
    owner_token, cust_token, booking = _confirmed_booking(client, db_session, "pay-owner2@test.dev")
    intruder = signup_customer(client, "+919810000102")

    res = client.post(f"/api/v1/bookings/{booking['id']}/payment", headers=auth_header(intruder["access_token"]))
    assert res.status_code == 404


def test_create_payment_order_returns_created_status(client, db_session):
    owner_token, cust_token, booking = _confirmed_booking(client, db_session, "pay-owner3@test.dev")

    res = client.post(f"/api/v1/bookings/{booking['id']}/payment", headers=auth_header(cust_token))
    assert res.status_code == 201
    order = res.json()
    assert order["status"] == "CREATED"
    assert order["gateway"] == "dev"
    assert order["amount"] == booking["price_at_booking"]
    assert order["gateway_order_id"].startswith("order_dev_")


def test_creating_payment_order_twice_reuses_the_pending_one(client, db_session):
    owner_token, cust_token, booking = _confirmed_booking(client, db_session, "pay-owner4@test.dev")

    order1 = client.post(f"/api/v1/bookings/{booking['id']}/payment", headers=auth_header(cust_token)).json()
    order2 = client.post(f"/api/v1/bookings/{booking['id']}/payment", headers=auth_header(cust_token)).json()
    assert order1["id"] == order2["id"]


def test_dev_complete_marks_order_paid(client, db_session):
    owner_token, cust_token, booking = _confirmed_booking(client, db_session, "pay-owner5@test.dev")
    order = client.post(f"/api/v1/bookings/{booking['id']}/payment", headers=auth_header(cust_token)).json()

    res = client.post(f"/api/v1/payments/{order['id']}/dev-complete", headers=auth_header(cust_token))
    assert res.status_code == 200
    assert res.json()["status"] == "PAID"
    assert res.json()["paid_at"] is not None


def test_dev_complete_failure_marks_order_failed(client, db_session):
    owner_token, cust_token, booking = _confirmed_booking(client, db_session, "pay-owner6@test.dev")
    order = client.post(f"/api/v1/bookings/{booking['id']}/payment", headers=auth_header(cust_token)).json()

    res = client.post(f"/api/v1/payments/{order['id']}/dev-complete", params={"success": False}, headers=auth_header(cust_token))
    assert res.status_code == 200
    assert res.json()["status"] == "FAILED"


def test_only_order_owner_can_trigger_dev_complete(client, db_session):
    owner_token, cust_token, booking = _confirmed_booking(client, db_session, "pay-owner7@test.dev")
    order = client.post(f"/api/v1/bookings/{booking['id']}/payment", headers=auth_header(cust_token)).json()

    intruder = signup_customer(client, "+919810000103")
    res = client.post(f"/api/v1/payments/{order['id']}/dev-complete", headers=auth_header(intruder["access_token"]))
    assert res.status_code == 404


def test_starting_service_before_payment_is_rejected(client, db_session):
    owner_token, cust_token, booking = _confirmed_booking(client, db_session, "pay-owner8@test.dev")

    res = client.post(f"/api/v1/bookings/{booking['id']}/start", headers=auth_header(owner_token))
    assert res.status_code == 422


def test_starting_service_after_payment_succeeds(client, db_session):
    owner_token, cust_token, booking = _confirmed_booking(client, db_session, "pay-owner9@test.dev")
    order = client.post(f"/api/v1/bookings/{booking['id']}/payment", headers=auth_header(cust_token)).json()
    client.post(f"/api/v1/payments/{order['id']}/dev-complete", headers=auth_header(cust_token))

    res = client.post(f"/api/v1/bookings/{booking['id']}/start", headers=auth_header(owner_token))
    assert res.status_code == 200
    assert res.json()["status"] == "IN_PROGRESS"


def test_completing_a_paid_booking_creates_a_settlement(client, db_session):
    owner_token, cust_token, booking = _confirmed_booking(client, db_session, "pay-owner10@test.dev", {"price": 1000.0})
    order = client.post(f"/api/v1/bookings/{booking['id']}/payment", headers=auth_header(cust_token)).json()
    client.post(f"/api/v1/payments/{order['id']}/dev-complete", headers=auth_header(cust_token))
    client.post(f"/api/v1/bookings/{booking['id']}/start", headers=auth_header(owner_token))
    client.post(f"/api/v1/bookings/{booking['id']}/complete", headers=auth_header(owner_token))

    provider_id = booking["provider_id"]
    res = client.get(f"/api/v1/providers/{provider_id}/settlements", headers=auth_header(owner_token))
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) == 1
    settlement = items[0]
    assert settlement["gross_amount"] == 1000.0
    assert settlement["commission_amount"] == 150.0
    assert settlement["net_payable_amount"] == 850.0
    assert settlement["status"] == "PENDING"


def test_cancelling_a_paid_confirmed_booking_issues_a_refund(client, db_session):
    owner_token, cust_token, booking = _confirmed_booking(client, db_session, "pay-owner11@test.dev")
    order = client.post(f"/api/v1/bookings/{booking['id']}/payment", headers=auth_header(cust_token)).json()
    client.post(f"/api/v1/payments/{order['id']}/dev-complete", headers=auth_header(cust_token))

    res = client.post(f"/api/v1/bookings/{booking['id']}/cancel", json={"reason": "Change of plans"}, headers=auth_header(cust_token))
    assert res.status_code == 200
    assert res.json()["status"] == "CANCELLED"

    refunds = client.get(f"/api/v1/bookings/{booking['id']}/refunds", headers=auth_header(cust_token)).json()
    assert len(refunds) == 1
    assert refunds[0]["status"] == "PROCESSED"
    assert refunds[0]["amount"] == booking["price_at_booking"]

    payment = client.get(f"/api/v1/bookings/{booking['id']}/payment", headers=auth_header(cust_token)).json()
    assert payment["status"] == "REFUNDED"


def test_cancelling_an_unpaid_booking_issues_no_refund(client, db_session):
    owner_token, cust_token, booking = _confirmed_booking(client, db_session, "pay-owner12@test.dev")

    res = client.post(f"/api/v1/bookings/{booking['id']}/cancel", json={}, headers=auth_header(cust_token))
    assert res.status_code == 200

    refunds = client.get(f"/api/v1/bookings/{booking['id']}/refunds", headers=auth_header(cust_token)).json()
    assert refunds == []


def test_webhook_with_invalid_signature_is_rejected(client, db_session):
    owner_token, cust_token, booking = _confirmed_booking(client, db_session, "pay-owner13@test.dev")
    order = client.post(f"/api/v1/bookings/{booking['id']}/payment", headers=auth_header(cust_token)).json()

    res = client.post(
        "/api/v1/payments/webhook",
        content=f'{{"event": "payment.captured", "id": "evt_x", "payload": {{"payment": {{"entity": {{"order_id": "{order["gateway_order_id"]}"}}}}}}}}',
        headers={"X-Razorpay-Signature": "not-a-real-signature", "Content-Type": "application/json"},
    )
    assert res.status_code == 422

    payment = client.get(f"/api/v1/bookings/{booking['id']}/payment", headers=auth_header(cust_token)).json()
    assert payment["status"] == "CREATED"


def test_settlement_visible_only_to_owner_or_admin(client, db_session):
    owner_token, cust_token, booking = _confirmed_booking(client, db_session, "pay-owner14@test.dev")
    order = client.post(f"/api/v1/bookings/{booking['id']}/payment", headers=auth_header(cust_token)).json()
    client.post(f"/api/v1/payments/{order['id']}/dev-complete", headers=auth_header(cust_token))
    client.post(f"/api/v1/bookings/{booking['id']}/start", headers=auth_header(owner_token))
    client.post(f"/api/v1/bookings/{booking['id']}/complete", headers=auth_header(owner_token))

    res = client.get(f"/api/v1/providers/{booking['provider_id']}/settlements", headers=auth_header(cust_token))
    assert res.status_code == 403


def test_admin_can_list_and_pay_out_settlements(client, db_session):
    owner_token, cust_token, booking = _confirmed_booking(client, db_session, "pay-owner15@test.dev")
    order = client.post(f"/api/v1/bookings/{booking['id']}/payment", headers=auth_header(cust_token)).json()
    client.post(f"/api/v1/payments/{order['id']}/dev-complete", headers=auth_header(cust_token))
    client.post(f"/api/v1/bookings/{booking['id']}/start", headers=auth_header(owner_token))
    client.post(f"/api/v1/bookings/{booking['id']}/complete", headers=auth_header(owner_token))

    create_staff_user(db_session, "pay-admin1@test.dev", role=Role.ADMIN)
    admin_token = login_staff(client, "pay-admin1@test.dev")["access_token"]

    res = client.get("/api/v1/admin/settlements", params={"status": "PENDING"}, headers=auth_header(admin_token))
    assert res.status_code == 200
    settlements = res.json()["items"]
    assert len(settlements) == 1
    settlement_id = settlements[0]["id"]

    res = client.post(f"/api/v1/admin/settlements/{settlement_id}/pay-out", headers=auth_header(admin_token))
    assert res.status_code == 200
    assert res.json()["status"] == "PAID_OUT"
    assert res.json()["paid_out_at"] is not None

    res = client.post(f"/api/v1/admin/settlements/{settlement_id}/pay-out", headers=auth_header(admin_token))
    assert res.status_code == 422


def test_non_admin_cannot_pay_out_settlements(client, db_session):
    owner_token, cust_token, booking = _confirmed_booking(client, db_session, "pay-owner16@test.dev")
    order = client.post(f"/api/v1/bookings/{booking['id']}/payment", headers=auth_header(cust_token)).json()
    client.post(f"/api/v1/payments/{order['id']}/dev-complete", headers=auth_header(cust_token))
    client.post(f"/api/v1/bookings/{booking['id']}/start", headers=auth_header(owner_token))
    client.post(f"/api/v1/bookings/{booking['id']}/complete", headers=auth_header(owner_token))

    settlement = client.get(
        f"/api/v1/providers/{booking['provider_id']}/settlements", headers=auth_header(owner_token)
    ).json()["items"][0]

    res = client.post(f"/api/v1/admin/settlements/{settlement['id']}/pay-out", headers=auth_header(owner_token))
    assert res.status_code == 403
