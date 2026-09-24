from datetime import date, timedelta

from tests.helpers import (
    auth_header,
    create_package,
    create_provider,
    create_provider_owner,
    login_staff,
    set_full_week_availability,
    signup_customer,
)


def test_provider_owner_can_create_their_business_profile(client, db_session):
    create_provider_owner(client, db_session, "owner1@test.dev")
    token = login_staff(client, "owner1@test.dev")["access_token"]
    provider = create_provider(client, token)

    assert provider["business_name"] == "Test Car Spa"
    assert provider["verification_status"] == "UNVERIFIED"
    assert provider["packages"] == []


def test_customer_cannot_create_a_provider(client, db_session):
    customer = signup_customer(client, "+919600000001")
    res = client.post(
        "/api/v1/providers",
        json={"business_name": "x", "address": "x", "city": "Noida"},
        headers=auth_header(customer["access_token"]),
    )
    assert res.status_code == 403


def test_owner_cannot_create_a_second_provider(client, db_session):
    create_provider_owner(client, db_session, "owner2@test.dev")
    token = login_staff(client, "owner2@test.dev")["access_token"]
    create_provider(client, token)

    res = client.post("/api/v1/providers", json={"business_name": "Second", "address": "x", "city": "Noida"}, headers=auth_header(token))
    assert res.status_code == 409


def test_mine_returns_null_before_provider_created(client, db_session):
    create_provider_owner(client, db_session, "owner3@test.dev")
    token = login_staff(client, "owner3@test.dev")["access_token"]

    res = client.get("/api/v1/providers/mine", headers=auth_header(token))
    assert res.status_code == 200
    assert res.json() is None


def test_other_owner_cannot_update_someone_elses_provider(client, db_session):
    create_provider_owner(client, db_session, "owner4a@test.dev")
    token_a = login_staff(client, "owner4a@test.dev")["access_token"]
    provider = create_provider(client, token_a)

    create_provider_owner(client, db_session, "owner4b@test.dev")
    token_b = login_staff(client, "owner4b@test.dev")["access_token"]

    res = client.put(
        f"/api/v1/providers/{provider['id']}", json={"business_name": "Hacked"}, headers=auth_header(token_b)
    )
    assert res.status_code == 403


def test_search_only_returns_active_providers_and_supports_filters(client, db_session):
    create_provider_owner(client, db_session, "owner5@test.dev")
    token = login_staff(client, "owner5@test.dev")["access_token"]
    provider = create_provider(client, token, {"business_name": "Shiny Wash", "city": "Noida"})
    create_package(client, token, provider["id"], {"category": "DETAILING"})

    res = client.get("/api/v1/providers", params={"city": "Noida"})
    names = [p["business_name"] for p in res.json()["items"]]
    assert "Shiny Wash" in names

    res = client.get("/api/v1/providers", params={"q": "Shiny"})
    assert len(res.json()["items"]) == 1

    res = client.get("/api/v1/providers", params={"category": "DETAILING"})
    assert any(p["business_name"] == "Shiny Wash" for p in res.json()["items"])

    res = client.get("/api/v1/providers", params={"category": "AC_SERVICE"})
    assert all(p["business_name"] != "Shiny Wash" for p in res.json()["items"])


def test_package_create_rejects_invalid_category(client, db_session):
    create_provider_owner(client, db_session, "owner6@test.dev")
    token = login_staff(client, "owner6@test.dev")["access_token"]
    provider = create_provider(client, token)

    res = client.post(
        f"/api/v1/providers/{provider['id']}/packages",
        json={"category": "NOT_REAL", "name": "x", "price": 100, "duration_minutes": 30},
        headers=auth_header(token),
    )
    assert res.status_code == 422


def test_package_create_rejects_non_positive_price(client, db_session):
    create_provider_owner(client, db_session, "owner7@test.dev")
    token = login_staff(client, "owner7@test.dev")["access_token"]
    provider = create_provider(client, token)

    res = client.post(
        f"/api/v1/providers/{provider['id']}/packages",
        json={"category": "CAR_WASH", "name": "x", "price": 0, "duration_minutes": 30},
        headers=auth_header(token),
    )
    assert res.status_code == 422


def test_deactivated_package_is_hidden_from_public_listing(client, db_session):
    create_provider_owner(client, db_session, "owner8@test.dev")
    token = login_staff(client, "owner8@test.dev")["access_token"]
    provider = create_provider(client, token)
    package = create_package(client, token, provider["id"])

    res = client.get(f"/api/v1/providers/{provider['id']}/packages")
    assert len(res.json()) == 1

    client.put(
        f"/api/v1/providers/{provider['id']}/packages/{package['id']}",
        json={"is_active": False},
        headers=auth_header(token),
    )

    res = client.get(f"/api/v1/providers/{provider['id']}/packages")
    assert res.json() == []

    # owner still sees it
    res = client.get(f"/api/v1/providers/{provider['id']}/packages", headers=auth_header(token))
    assert len(res.json()) == 1


def test_availability_rejects_closes_before_opens(client, db_session):
    create_provider_owner(client, db_session, "owner9@test.dev")
    token = login_staff(client, "owner9@test.dev")["access_token"]
    provider = create_provider(client, token)

    res = client.put(
        f"/api/v1/providers/{provider['id']}/availability",
        json={"days": [{"day_of_week": 0, "opens_at": "18:00:00", "closes_at": "09:00:00"}]},
        headers=auth_header(token),
    )
    assert res.status_code == 422


def test_availability_rejects_duplicate_day(client, db_session):
    create_provider_owner(client, db_session, "owner10@test.dev")
    token = login_staff(client, "owner10@test.dev")["access_token"]
    provider = create_provider(client, token)

    res = client.put(
        f"/api/v1/providers/{provider['id']}/availability",
        json={
            "days": [
                {"day_of_week": 0, "opens_at": "09:00:00", "closes_at": "18:00:00"},
                {"day_of_week": 0, "opens_at": "10:00:00", "closes_at": "17:00:00"},
            ]
        },
        headers=auth_header(token),
    )
    assert res.status_code == 422


def test_available_slots_empty_without_availability_set(client, db_session):
    create_provider_owner(client, db_session, "owner11@test.dev")
    token = login_staff(client, "owner11@test.dev")["access_token"]
    provider = create_provider(client, token)
    package = create_package(client, token, provider["id"])

    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    res = client.get(
        f"/api/v1/providers/{provider['id']}/packages/{package['id']}/available-slots", params={"date": tomorrow}
    )
    assert res.status_code == 200
    assert res.json() == []


def test_available_slots_returns_slots_once_availability_is_set(client, db_session):
    create_provider_owner(client, db_session, "owner12@test.dev")
    token = login_staff(client, "owner12@test.dev")["access_token"]
    provider = create_provider(client, token)
    package = create_package(client, token, provider["id"], {"duration_minutes": 60})
    set_full_week_availability(client, token, provider["id"], "09:00:00", "12:00:00")

    tomorrow = date.today() + timedelta(days=1)
    res = client.get(
        f"/api/v1/providers/{provider['id']}/packages/{package['id']}/available-slots",
        params={"date": tomorrow.isoformat()},
    )
    assert res.status_code == 200
    assert len(res.json()) == 3


def test_available_slots_rejects_past_date(client, db_session):
    create_provider_owner(client, db_session, "owner13@test.dev")
    token = login_staff(client, "owner13@test.dev")["access_token"]
    provider = create_provider(client, token)
    package = create_package(client, token, provider["id"])

    yesterday = (date.today() - timedelta(days=1)).isoformat()
    res = client.get(
        f"/api/v1/providers/{provider['id']}/packages/{package['id']}/available-slots", params={"date": yesterday}
    )
    assert res.status_code == 422
