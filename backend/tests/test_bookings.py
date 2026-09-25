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


def _setup_provider(client, db_session, email, package_overrides=None):
    create_provider_owner(client, db_session, email)
    token = login_staff(client, email)["access_token"]
    provider = create_provider(client, token)
    package = create_package(client, token, provider["id"], package_overrides)
    set_full_week_availability(client, token, provider["id"])
    return token, provider, package


def _first_slot(client, provider_id, package_id):
    tomorrow = date.today() + timedelta(days=1)
    res = client.get(f"/api/v1/providers/{provider_id}/packages/{package_id}/available-slots", params={"date": tomorrow.isoformat()})
    slots = res.json()
    assert slots, "expected at least one available slot"
    return slots[0]


def test_full_happy_path_pending_to_completed(client, db_session):
    owner_token, provider, package = _setup_provider(client, db_session, "bk-owner1@test.dev")

    customer = signup_customer(client, "+919700000001")
    cust_token = customer["access_token"]
    vehicle = create_vehicle(client, cust_token)
    address = create_address(client, cust_token)

    slot = _first_slot(client, provider["id"], package["id"])

    res = client.post(
        "/api/v1/bookings",
        json={"package_id": package["id"], "vehicle_id": vehicle["id"], "address_id": address["id"], "scheduled_at": slot},
        headers=auth_header(cust_token),
    )
    assert res.status_code == 201, res.text
    booking = res.json()
    assert booking["status"] == "PENDING"
    assert booking["price_at_booking"] == package["price"]
    assert booking["duration_minutes"] == package["duration_minutes"]

    booking_id = booking["id"]

    res = client.post(f"/api/v1/bookings/{booking_id}/confirm", headers=auth_header(owner_token))
    assert res.status_code == 200
    assert res.json()["status"] == "CONFIRMED"
    assert res.json()["confirmed_at"] is not None

    # Service cannot start until the booking is paid — see test_payments.py for the
    # dedicated payment/refund/settlement test suite; this test just needs the
    # booking paid to keep exercising the rest of the state machine.
    order = client.post(f"/api/v1/bookings/{booking_id}/payment", headers=auth_header(cust_token)).json()
    client.post(f"/api/v1/payments/{order['id']}/dev-complete", headers=auth_header(cust_token))

    res = client.post(f"/api/v1/bookings/{booking_id}/start", headers=auth_header(owner_token))
    assert res.status_code == 200
    assert res.json()["status"] == "IN_PROGRESS"

    res = client.post(f"/api/v1/bookings/{booking_id}/complete", headers=auth_header(owner_token))
    assert res.status_code == 200
    assert res.json()["status"] == "COMPLETED"
    assert res.json()["completed_at"] is not None


def test_provider_can_reject_a_pending_booking_with_reason(client, db_session):
    owner_token, provider, package = _setup_provider(client, db_session, "bk-owner2@test.dev")
    customer = signup_customer(client, "+919700000002")
    cust_token = customer["access_token"]
    vehicle = create_vehicle(client, cust_token)
    address = create_address(client, cust_token)
    slot = _first_slot(client, provider["id"], package["id"])

    booking = client.post(
        "/api/v1/bookings",
        json={"package_id": package["id"], "vehicle_id": vehicle["id"], "address_id": address["id"], "scheduled_at": slot},
        headers=auth_header(cust_token),
    ).json()

    res = client.post(
        f"/api/v1/bookings/{booking['id']}/reject", json={"reason": "Fully booked"}, headers=auth_header(owner_token)
    )
    assert res.status_code == 200
    assert res.json()["status"] == "REJECTED"
    assert res.json()["cancellation_reason"] == "Fully booked"


def test_customer_can_cancel_own_pending_booking(client, db_session):
    owner_token, provider, package = _setup_provider(client, db_session, "bk-owner3@test.dev")
    customer = signup_customer(client, "+919700000003")
    cust_token = customer["access_token"]
    vehicle = create_vehicle(client, cust_token)
    address = create_address(client, cust_token)
    slot = _first_slot(client, provider["id"], package["id"])

    booking = client.post(
        "/api/v1/bookings",
        json={"package_id": package["id"], "vehicle_id": vehicle["id"], "address_id": address["id"], "scheduled_at": slot},
        headers=auth_header(cust_token),
    ).json()

    res = client.post(f"/api/v1/bookings/{booking['id']}/cancel", json={"reason": "Changed my mind"}, headers=auth_header(cust_token))
    assert res.status_code == 200
    assert res.json()["status"] == "CANCELLED"
    assert res.json()["cancelled_by_role"] == "CUSTOMER"


def test_customer_cannot_confirm_their_own_booking(client, db_session):
    owner_token, provider, package = _setup_provider(client, db_session, "bk-owner4@test.dev")
    customer = signup_customer(client, "+919700000004")
    cust_token = customer["access_token"]
    vehicle = create_vehicle(client, cust_token)
    address = create_address(client, cust_token)
    slot = _first_slot(client, provider["id"], package["id"])

    booking = client.post(
        "/api/v1/bookings",
        json={"package_id": package["id"], "vehicle_id": vehicle["id"], "address_id": address["id"], "scheduled_at": slot},
        headers=auth_header(cust_token),
    ).json()

    res = client.post(f"/api/v1/bookings/{booking['id']}/confirm", headers=auth_header(cust_token))
    assert res.status_code == 403


def test_another_customer_cannot_see_or_act_on_someone_elses_booking(client, db_session):
    owner_token, provider, package = _setup_provider(client, db_session, "bk-owner5@test.dev")
    customer = signup_customer(client, "+919700000005")
    cust_token = customer["access_token"]
    vehicle = create_vehicle(client, cust_token)
    address = create_address(client, cust_token)
    slot = _first_slot(client, provider["id"], package["id"])

    booking = client.post(
        "/api/v1/bookings",
        json={"package_id": package["id"], "vehicle_id": vehicle["id"], "address_id": address["id"], "scheduled_at": slot},
        headers=auth_header(cust_token),
    ).json()

    intruder = signup_customer(client, "+919700000006")
    res = client.get(f"/api/v1/bookings/{booking['id']}", headers=auth_header(intruder["access_token"]))
    assert res.status_code == 403

    res = client.post(f"/api/v1/bookings/{booking['id']}/cancel", json={}, headers=auth_header(intruder["access_token"]))
    assert res.status_code == 403


def test_cannot_double_book_the_same_slot(client, db_session):
    owner_token, provider, package = _setup_provider(client, db_session, "bk-owner6@test.dev")

    cust1 = signup_customer(client, "+919700000007")
    vehicle1 = create_vehicle(client, cust1["access_token"])
    address1 = create_address(client, cust1["access_token"])
    slot = _first_slot(client, provider["id"], package["id"])

    res1 = client.post(
        "/api/v1/bookings",
        json={"package_id": package["id"], "vehicle_id": vehicle1["id"], "address_id": address1["id"], "scheduled_at": slot},
        headers=auth_header(cust1["access_token"]),
    )
    assert res1.status_code == 201

    cust2 = signup_customer(client, "+919700000008")
    vehicle2 = create_vehicle(client, cust2["access_token"], {"registration_number": "DL02CD5678"})
    address2 = create_address(client, cust2["access_token"])

    res2 = client.post(
        "/api/v1/bookings",
        json={"package_id": package["id"], "vehicle_id": vehicle2["id"], "address_id": address2["id"], "scheduled_at": slot},
        headers=auth_header(cust2["access_token"]),
    )
    assert res2.status_code == 409


def test_doorstep_package_requires_an_address(client, db_session):
    owner_token, provider, package = _setup_provider(client, db_session, "bk-owner7@test.dev", {"is_doorstep": True})
    customer = signup_customer(client, "+919700000009")
    cust_token = customer["access_token"]
    vehicle = create_vehicle(client, cust_token)
    slot = _first_slot(client, provider["id"], package["id"])

    res = client.post(
        "/api/v1/bookings",
        json={"package_id": package["id"], "vehicle_id": vehicle["id"], "scheduled_at": slot},
        headers=auth_header(cust_token),
    )
    assert res.status_code == 422


def test_non_doorstep_package_does_not_require_an_address(client, db_session):
    owner_token, provider, package = _setup_provider(client, db_session, "bk-owner8@test.dev", {"is_doorstep": False})
    customer = signup_customer(client, "+919700000010")
    cust_token = customer["access_token"]
    vehicle = create_vehicle(client, cust_token)
    slot = _first_slot(client, provider["id"], package["id"])

    res = client.post(
        "/api/v1/bookings",
        json={"package_id": package["id"], "vehicle_id": vehicle["id"], "scheduled_at": slot},
        headers=auth_header(cust_token),
    )
    assert res.status_code == 201


def test_cannot_book_someone_elses_vehicle(client, db_session):
    owner_token, provider, package = _setup_provider(client, db_session, "bk-owner9@test.dev")
    customer = signup_customer(client, "+919700000011")
    other = signup_customer(client, "+919700000012")
    other_vehicle = create_vehicle(client, other["access_token"])
    address = create_address(client, customer["access_token"])
    slot = _first_slot(client, provider["id"], package["id"])

    res = client.post(
        "/api/v1/bookings",
        json={"package_id": package["id"], "vehicle_id": other_vehicle["id"], "address_id": address["id"], "scheduled_at": slot},
        headers=auth_header(customer["access_token"]),
    )
    assert res.status_code == 404


def test_cannot_book_a_slot_outside_computed_availability(client, db_session):
    owner_token, provider, package = _setup_provider(client, db_session, "bk-owner10@test.dev")
    customer = signup_customer(client, "+919700000013")
    vehicle = create_vehicle(client, customer["access_token"])
    address = create_address(client, customer["access_token"])

    # Midnight is outside the 09:00-18:00 availability window set by _setup_provider.
    far_future_midnight = (date.today() + timedelta(days=3)).isoformat() + "T00:00:00+00:00"

    res = client.post(
        "/api/v1/bookings",
        json={
            "package_id": package["id"],
            "vehicle_id": vehicle["id"],
            "address_id": address["id"],
            "scheduled_at": far_future_midnight,
        },
        headers=auth_header(customer["access_token"]),
    )
    assert res.status_code == 409


def test_customer_bookings_mine_lists_created_booking(client, db_session):
    owner_token, provider, package = _setup_provider(client, db_session, "bk-owner11@test.dev")
    customer = signup_customer(client, "+919700000014")
    cust_token = customer["access_token"]
    vehicle = create_vehicle(client, cust_token)
    address = create_address(client, cust_token)
    slot = _first_slot(client, provider["id"], package["id"])

    client.post(
        "/api/v1/bookings",
        json={"package_id": package["id"], "vehicle_id": vehicle["id"], "address_id": address["id"], "scheduled_at": slot},
        headers=auth_header(cust_token),
    )

    res = client.get("/api/v1/bookings/mine", headers=auth_header(cust_token))
    assert res.status_code == 200
    assert res.json()["meta"]["total"] == 1


def test_provider_bookings_mine_lists_incoming_booking(client, db_session):
    owner_token, provider, package = _setup_provider(client, db_session, "bk-owner12@test.dev")
    customer = signup_customer(client, "+919700000015")
    cust_token = customer["access_token"]
    vehicle = create_vehicle(client, cust_token)
    address = create_address(client, cust_token)
    slot = _first_slot(client, provider["id"], package["id"])

    client.post(
        "/api/v1/bookings",
        json={"package_id": package["id"], "vehicle_id": vehicle["id"], "address_id": address["id"], "scheduled_at": slot},
        headers=auth_header(cust_token),
    )

    res = client.get("/api/v1/bookings/provider/mine", headers=auth_header(owner_token))
    assert res.status_code == 200
    assert res.json()["meta"]["total"] == 1


def test_customer_bookings_mine_carries_each_bookings_own_details_not_mixed_up(client, db_session):
    """Regression test for the batched (per-page) provider/package/payment-status
    lookup `_to_out_batch` uses for booking lists — each booking must get back its own
    provider name, package name, and payment status, not another booking's."""
    owner_a_token, provider_a, package_a = _setup_provider(
        client, db_session, "bk-owner13a@test.dev", {"name": "Package A", "price": 111.0}
    )
    owner_b_token, provider_b, package_b = _setup_provider(
        client, db_session, "bk-owner13b@test.dev", {"name": "Package B", "price": 222.0}
    )
    customer = signup_customer(client, "+919700000016")
    cust_token = customer["access_token"]
    vehicle = create_vehicle(client, cust_token)
    address = create_address(client, cust_token)

    slot_a = _first_slot(client, provider_a["id"], package_a["id"])
    booking_a = client.post(
        "/api/v1/bookings",
        json={"package_id": package_a["id"], "vehicle_id": vehicle["id"], "address_id": address["id"], "scheduled_at": slot_a},
        headers=auth_header(cust_token),
    ).json()

    slot_b = _first_slot(client, provider_b["id"], package_b["id"])
    booking_b = client.post(
        "/api/v1/bookings",
        json={"package_id": package_b["id"], "vehicle_id": vehicle["id"], "address_id": address["id"], "scheduled_at": slot_b},
        headers=auth_header(cust_token),
    ).json()

    # Confirm and pay for booking A only, so the two bookings end up with different
    # payment_status values too — the batched payment-order lookup must not cross them.
    client.post(f"/api/v1/bookings/{booking_a['id']}/confirm", headers=auth_header(owner_a_token))
    order = client.post(f"/api/v1/bookings/{booking_a['id']}/payment", headers=auth_header(cust_token)).json()
    client.post(f"/api/v1/payments/{order['id']}/dev-complete", headers=auth_header(cust_token))

    res = client.get("/api/v1/bookings/mine", headers=auth_header(cust_token))
    items = {item["id"]: item for item in res.json()["items"]}

    assert items[booking_a["id"]]["provider_name"] == provider_a["business_name"]
    assert items[booking_a["id"]]["package_name"] == "Package A"
    assert items[booking_a["id"]]["payment_status"] == "PAID"

    assert items[booking_b["id"]]["provider_name"] == provider_b["business_name"]
    assert items[booking_b["id"]]["package_name"] == "Package B"
    assert items[booking_b["id"]]["payment_status"] is None
