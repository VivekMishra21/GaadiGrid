from datetime import date, timedelta

import pytest

from app.core.config import settings
from tests.helpers import (
    auth_header,
    create_package,
    create_provider,
    create_provider_owner,
    create_vehicle,
    create_staff_user,
    login_staff,
    signup_customer,
)


@pytest.fixture
def fleet_enabled(monkeypatch):
    monkeypatch.setattr(settings, "fleet_pro_enabled", True)


def _owner_with_fleet(client, phone="+919850000001"):
    owner = signup_customer(client, phone)
    token = owner["access_token"]
    fleet = client.post("/api/v1/fleet", json={"company_name": "City Cabs"}, headers=auth_header(token))
    assert fleet.status_code == 201, fleet.text
    return token, fleet.json()


# --- Fleet Pro ------------------------------------------------------------------


def test_fleet_endpoints_stay_hidden_while_the_flag_is_off(client, db_session):
    token = signup_customer(client, "+919850000010")["access_token"]
    assert client.get("/api/v1/fleet/mine", headers=auth_header(token)).status_code == 404
    assert client.get("/api/v1/fleet/1/overview", headers=auth_header(token)).status_code == 404


def test_overview_shows_fleet_vehicles_reminders_and_spend(client, db_session, fleet_enabled):
    token, fleet = _owner_with_fleet(client)
    due = (date.today() + timedelta(days=5)).isoformat()
    cab1 = create_vehicle(client, token, {"registration_number": "DL01CA0001", "insurance_expiry": due})
    cab2 = create_vehicle(client, token, {"registration_number": "DL01CA0002"})
    personal = create_vehicle(client, token, {"registration_number": "DL01PE0003"})
    for v in (cab1, cab2):
        assert client.post(f"/api/v1/fleet/{fleet['id']}/vehicles/{v['id']}/attach", headers=auth_header(token)).status_code == 200
    client.post(
        f"/api/v1/vehicles/{cab1['id']}/expenses",
        json={"category": "FUEL", "amount": 1500.0, "expense_date": date.today().isoformat()},
        headers=auth_header(token),
    )
    client.post(
        f"/api/v1/vehicles/{personal['id']}/expenses",
        json={"category": "FUEL", "amount": 999.0, "expense_date": date.today().isoformat()},
        headers=auth_header(token),
    )

    res = client.get(f"/api/v1/fleet/{fleet['id']}/overview", headers=auth_header(token))
    assert res.status_code == 200, res.text
    overview = res.json()
    assert overview["your_role"] == "OWNER"
    assert {v["vehicle"]["registration_number"] for v in overview["vehicles"]} == {"DL01CA0001", "DL01CA0002"}
    assert overview["total_spend_period"] == 1500.0  # the personal car is not fleet spend
    assert [r["registration_number"] for r in overview["upcoming_reminders"]] == ["DL01CA0001"]
    cab1_row = next(v for v in overview["vehicles"] if v["vehicle"]["id"] == cab1["id"])
    assert cab1_row["spend_period"] == 1500.0 and cab1_row["latest_odometer_km"] is None


def test_manager_can_view_but_driver_cannot_and_only_owner_manages(client, db_session, fleet_enabled):
    token, fleet = _owner_with_fleet(client, "+919850000020")
    manager = signup_customer(client, "+919850000021")
    driver = signup_customer(client, "+919850000022")
    # Members are added by email, which phone-signup users don't have; give them one.
    from app.models.user import User

    for phone, email in (("+919850000021", "mgr@fleetco.com"), ("+919850000022", "drv@fleetco.com")):
        u = db_session.query(User).filter(User.phone == phone).first()
        u.email = email
    db_session.commit()

    for email, role in (("mgr@fleetco.com", "MANAGER"), ("drv@fleetco.com", "DRIVER")):
        added = client.post(f"/api/v1/fleet/{fleet['id']}/members", json={"email": email, "role": role}, headers=auth_header(token))
        assert added.status_code == 201, added.text

    assert client.get(f"/api/v1/fleet/{fleet['id']}/overview", headers=auth_header(manager["access_token"])).status_code == 200
    assert client.get(f"/api/v1/fleet/{fleet['id']}/overview", headers=auth_header(driver["access_token"])).status_code == 403
    assert client.post(f"/api/v1/fleet/{fleet['id']}/members", json={"email": "x@fleetco.com"}, headers=auth_header(manager["access_token"])).status_code == 403

    outsider = signup_customer(client, "+919850000023")["access_token"]
    assert client.get(f"/api/v1/fleet/{fleet['id']}/overview", headers=auth_header(outsider)).status_code == 403


def test_owner_can_detach_vehicles_and_remove_members_but_not_themselves(client, db_session, fleet_enabled):
    token, fleet = _owner_with_fleet(client, "+919850000030")
    vehicle = create_vehicle(client, token)
    client.post(f"/api/v1/fleet/{fleet['id']}/vehicles/{vehicle['id']}/attach", headers=auth_header(token))

    assert client.delete(f"/api/v1/fleet/{fleet['id']}/vehicles/{vehicle['id']}", headers=auth_header(token)).status_code == 204
    assert client.get(f"/api/v1/fleet/{fleet['id']}/overview", headers=auth_header(token)).json()["vehicles"] == []
    assert client.delete(f"/api/v1/fleet/{fleet['id']}/vehicles/{vehicle['id']}", headers=auth_header(token)).status_code == 404

    owner_id = fleet["members"][0]["user_id"]
    assert client.delete(f"/api/v1/fleet/{fleet['id']}/members/{owner_id}", headers=auth_header(token)).status_code == 403


# --- Smart Pit Stop by need -------------------------------------------------------


def _provider_with(client, db_session, email, category, name, lat, lng, price=500.0):
    create_provider_owner(client, db_session, email)
    token = login_staff(client, email)["access_token"]
    provider = create_provider(client, token, {"business_name": name, "latitude": lat, "longitude": lng})
    create_package(client, token, provider["id"], {"category": category, "name": f"{name} job", "price": price})
    return provider


def test_need_search_returns_only_matching_nearby_partners_nearest_first(client, db_session):
    near_tyre = _provider_with(client, db_session, "ps-a@test.dev", "TYRE_SERVICE", "Near Tyres", 28.5700, 77.3200)
    _provider_with(client, db_session, "ps-b@test.dev", "TYRE_SERVICE", "Farther Tyres", 28.6200, 77.3200, price=450.0)
    _provider_with(client, db_session, "ps-c@test.dev", "CAR_WASH", "Wash Only", 28.5701, 77.3201)
    _provider_with(client, db_session, "ps-d@test.dev", "TYRE_SERVICE", "Faraway Tyres", 29.9000, 77.9000)

    res = client.get("/api/v1/pit-stop/needs", params={"need": "TYRE_SERVICE", "lat": 28.5700, "lng": 77.3200, "radius_km": 10})
    assert res.status_code == 200, res.text
    body = res.json()
    names = [p["business_name"] for p in body["providers"]]
    assert names == ["Near Tyres", "Farther Tyres"]  # car wash is the wrong need; Faraway is outside the radius
    first = body["providers"][0]
    assert first["id"] == near_tyre["id"] and first["distance_km"] < 0.1
    assert first["packages"][0]["category"] == "TYRE_SERVICE" and first["packages"][0]["price"] == 500.0
    assert "not a diagnosis" in body["note"]


def test_car_wash_need_covers_detailing_and_unknown_needs_are_rejected(client, db_session):
    _provider_with(client, db_session, "ps-e@test.dev", "DETAILING", "Detail Studio", 28.5700, 77.3200)
    ok = client.get("/api/v1/pit-stop/needs", params={"need": "CAR_WASH", "lat": 28.57, "lng": 77.32})
    assert [p["business_name"] for p in ok.json()["providers"]] == ["Detail Studio"]

    bad = client.get("/api/v1/pit-stop/needs", params={"need": "ENGINE_DIAGNOSIS", "lat": 28.57, "lng": 77.32})
    assert bad.status_code == 422


def test_need_search_respects_the_feature_flag(client, db_session, monkeypatch):
    monkeypatch.setattr(settings, "smart_pit_stop_enabled", False)
    res = client.get("/api/v1/pit-stop/needs", params={"need": "CAR_WASH", "lat": 28.57, "lng": 77.32})
    assert res.status_code == 404
