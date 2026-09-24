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


def _first_slot(client, provider_id, package_id):
    tomorrow = date.today() + timedelta(days=1)
    res = client.get(f"/api/v1/providers/{provider_id}/packages/{package_id}/available-slots", params={"date": tomorrow.isoformat()})
    return res.json()[0]


def _completed_booking(client, db_session, email, phone):
    create_provider_owner(client, db_session, email)
    owner_token = login_staff(client, email)["access_token"]
    provider = create_provider(client, owner_token)
    package = create_package(client, owner_token, provider["id"])
    set_full_week_availability(client, owner_token, provider["id"])

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
    order = client.post(f"/api/v1/bookings/{booking['id']}/payment", headers=auth_header(cust_token)).json()
    client.post(f"/api/v1/payments/{order['id']}/dev-complete", headers=auth_header(cust_token))
    client.post(f"/api/v1/bookings/{booking['id']}/start", headers=auth_header(owner_token))
    client.post(f"/api/v1/bookings/{booking['id']}/complete", headers=auth_header(owner_token))

    return owner_token, cust_token, booking, provider


def test_customer_can_review_a_completed_booking(client, db_session):
    owner_token, cust_token, booking, provider = _completed_booking(client, db_session, "review1@test.dev", "+919823000001")

    res = client.post(f"/api/v1/bookings/{booking['id']}/review", json={"rating": 5, "comment": "Great work"}, headers=auth_header(cust_token))
    assert res.status_code == 201, res.text
    review = res.json()
    assert review["rating"] == 5
    assert review["provider_id"] == provider["id"]


def test_cannot_review_the_same_booking_twice(client, db_session):
    _, cust_token, booking, _ = _completed_booking(client, db_session, "review2@test.dev", "+919823000002")
    client.post(f"/api/v1/bookings/{booking['id']}/review", json={"rating": 4}, headers=auth_header(cust_token))

    res = client.post(f"/api/v1/bookings/{booking['id']}/review", json={"rating": 3}, headers=auth_header(cust_token))
    assert res.status_code == 409


def test_cannot_review_a_non_completed_booking(client, db_session):
    create_provider_owner(client, db_session, "review3@test.dev")
    owner_token = login_staff(client, "review3@test.dev")["access_token"]
    provider = create_provider(client, owner_token)
    package = create_package(client, owner_token, provider["id"])
    set_full_week_availability(client, owner_token, provider["id"])

    customer = signup_customer(client, "+919823000003")
    cust_token = customer["access_token"]
    vehicle = create_vehicle(client, cust_token)
    address = create_address(client, cust_token)
    slot = _first_slot(client, provider["id"], package["id"])
    booking = client.post(
        "/api/v1/bookings",
        json={"package_id": package["id"], "vehicle_id": vehicle["id"], "address_id": address["id"], "scheduled_at": slot},
        headers=auth_header(cust_token),
    ).json()

    res = client.post(f"/api/v1/bookings/{booking['id']}/review", json={"rating": 5}, headers=auth_header(cust_token))
    assert res.status_code == 422


def test_provider_cannot_review_own_booking(client, db_session):
    owner_token, _, booking, _ = _completed_booking(client, db_session, "review4@test.dev", "+919823000004")
    res = client.post(f"/api/v1/bookings/{booking['id']}/review", json={"rating": 5}, headers=auth_header(owner_token))
    assert res.status_code == 403


def test_provider_can_respond_to_a_review_once(client, db_session):
    owner_token, cust_token, booking, _ = _completed_booking(client, db_session, "review5@test.dev", "+919823000005")
    client.post(f"/api/v1/bookings/{booking['id']}/review", json={"rating": 5}, headers=auth_header(cust_token))

    res = client.post(f"/api/v1/bookings/{booking['id']}/review/response", json={"response": "Thank you!"}, headers=auth_header(owner_token))
    assert res.status_code == 200
    assert res.json()["provider_response"] == "Thank you!"

    res = client.post(f"/api/v1/bookings/{booking['id']}/review/response", json={"response": "Again"}, headers=auth_header(owner_token))
    assert res.status_code == 409


def test_provider_reviews_are_listed_publicly_with_aggregate_rating(client, db_session):
    _, cust_token, booking, provider = _completed_booking(client, db_session, "review6@test.dev", "+919823000006")
    client.post(f"/api/v1/bookings/{booking['id']}/review", json={"rating": 4, "comment": "Good"}, headers=auth_header(cust_token))

    res = client.get(f"/api/v1/providers/{provider['id']}/reviews")
    assert res.status_code == 200
    assert res.json()["meta"]["total"] == 1

    res = client.get(f"/api/v1/providers/{provider['id']}")
    detail = res.json()
    assert detail["average_rating"] == 4.0
    assert detail["review_count"] == 1


def test_provider_search_includes_average_rating(client, db_session):
    _, cust_token, booking, provider = _completed_booking(client, db_session, "review7@test.dev", "+919823000007")
    client.post(f"/api/v1/bookings/{booking['id']}/review", json={"rating": 3}, headers=auth_header(cust_token))

    res = client.get("/api/v1/providers", params={"city": provider["city"]})
    items = res.json()["items"]
    match = next(p for p in items if p["id"] == provider["id"])
    assert match["average_rating"] == 3.0
    assert match["review_count"] == 1
