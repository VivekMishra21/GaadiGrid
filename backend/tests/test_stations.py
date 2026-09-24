from app.models.audit_log import AuditLog
from tests.helpers import auth_header, create_station, create_staff_user, login_staff, signup_customer

ADMIN_EMAIL = "stations-admin@gaadigrid.dev"


def _admin_token(client, db_session):
    create_staff_user(db_session, ADMIN_EMAIL)
    return login_staff(client, ADMIN_EMAIL)["access_token"]


def test_unauthenticated_user_cannot_create_station(client, fuel_types):
    res = client.post("/api/v1/stations", json={})
    assert res.status_code == 401


def test_non_admin_cannot_create_station(client, fuel_types, db_session):
    signup_result = signup_customer(client, "+919400000001")
    headers = auth_header(signup_result["access_token"])

    res = client.post("/api/v1/stations", json={"name": "x"}, headers=headers)
    assert res.status_code == 403


def test_admin_can_create_and_fetch_station(client, fuel_types, db_session):
    token = _admin_token(client, db_session)
    station = create_station(client, token)

    assert station["name"] == "Test Station"
    assert station["prices"] == []
    assert station["queue_status"]["queue"]["value"] is None

    res = client.get(f"/api/v1/stations/{station['id']}")
    assert res.status_code == 200
    assert res.json()["id"] == station["id"]


def test_admin_station_mutations_are_audit_logged(client, fuel_types, db_session):
    token = _admin_token(client, db_session)
    station = create_station(client, token)

    client.put(f"/api/v1/stations/{station['id']}", json={"name": "Renamed Station"}, headers=auth_header(token))
    client.delete(f"/api/v1/stations/{station['id']}", headers=auth_header(token))

    actions = {row.action for row in db_session.query(AuditLog).filter(AuditLog.target_id == str(station["id"])).all()}
    assert "station.create" in actions
    assert "station.update" in actions
    assert "station.delete" in actions


def test_get_nonexistent_station_returns_404(client, fuel_types):
    res = client.get("/api/v1/stations/999999")
    assert res.status_code == 404


def test_admin_can_delete_station_and_it_disappears(client, fuel_types, db_session):
    token = _admin_token(client, db_session)
    station = create_station(client, token)

    res = client.delete(f"/api/v1/stations/{station['id']}", headers=auth_header(token))
    assert res.status_code == 204

    res = client.get(f"/api/v1/stations/{station['id']}")
    assert res.status_code == 404


def test_search_filters_by_city(client, fuel_types, db_session):
    token = _admin_token(client, db_session)
    create_station(client, token, {"name": "Noida Station", "city": "Noida"})
    create_station(client, token, {"name": "Delhi Station", "city": "Delhi", "latitude": 28.7, "longitude": 77.1})

    res = client.get("/api/v1/stations", params={"city": "Delhi"})
    assert res.status_code == 200
    names = [item["name"] for item in res.json()["items"]]
    assert names == ["Delhi Station"]


def test_search_filters_by_text_query(client, fuel_types, db_session):
    token = _admin_token(client, db_session)
    create_station(client, token, {"name": "Shell Sector 9"})
    create_station(client, token, {"name": "HP Sector 20", "latitude": 28.6, "longitude": 77.4})

    res = client.get("/api/v1/stations", params={"q": "Shell"})
    names = [item["name"] for item in res.json()["items"]]
    assert names == ["Shell Sector 9"]


def test_search_orders_by_distance_when_location_given(client, fuel_types, db_session):
    token = _admin_token(client, db_session)
    create_station(client, token, {"name": "Near", "latitude": 28.5708, "longitude": 77.3260})
    create_station(client, token, {"name": "Far", "latitude": 28.7, "longitude": 77.5})

    res = client.get("/api/v1/stations", params={"lat": 28.5708, "lng": 77.3260, "radius_km": 50})
    items = res.json()["items"]
    names_in_order = [item["name"] for item in items]

    assert names_in_order.index("Near") < names_in_order.index("Far")
    assert items[names_in_order.index("Near")]["distance_km"] == 0.0


def test_search_radius_excludes_distant_stations(client, fuel_types, db_session):
    token = _admin_token(client, db_session)
    create_station(client, token, {"name": "Close", "latitude": 28.5708, "longitude": 77.3260})
    create_station(client, token, {"name": "VeryFar", "latitude": 19.0760, "longitude": 72.8777})

    res = client.get("/api/v1/stations", params={"lat": 28.5708, "lng": 77.3260, "radius_km": 5})
    names = [item["name"] for item in res.json()["items"]]
    assert names == ["Close"]


def test_search_requires_both_lat_and_lng(client, fuel_types):
    res = client.get("/api/v1/stations", params={"lat": 28.5708})
    assert res.status_code in (400, 422)


def test_search_filters_by_fuel_type(client, fuel_types, db_session):
    token = _admin_token(client, db_session)
    petrol_station = create_station(client, token, {"name": "HasPetrol"})
    cng_only = create_station(client, token, {"name": "CngOnly", "latitude": 28.6, "longitude": 77.4})

    client.put(
        f"/api/v1/stations/{petrol_station['id']}/prices",
        json={"prices": [{"fuel_type_code": "PETROL", "price": 96.5}]},
        headers=auth_header(token),
    )
    client.put(
        f"/api/v1/stations/{cng_only['id']}/prices",
        json={"prices": [{"fuel_type_code": "CNG", "price": 77.0}]},
        headers=auth_header(token),
    )

    res = client.get("/api/v1/stations", params={"fuel_type": "PETROL"})
    names = [item["name"] for item in res.json()["items"]]
    assert names == ["HasPetrol"]


def test_price_upsert_rejects_unknown_fuel_type(client, fuel_types, db_session):
    token = _admin_token(client, db_session)
    station = create_station(client, token)

    res = client.put(
        f"/api/v1/stations/{station['id']}/prices",
        json={"prices": [{"fuel_type_code": "ROCKET_FUEL", "price": 10}]},
        headers=auth_header(token),
    )
    assert res.status_code in (400, 422)


def test_price_upsert_rejects_zero_or_negative_price(client, fuel_types, db_session):
    token = _admin_token(client, db_session)
    station = create_station(client, token)

    res = client.put(
        f"/api/v1/stations/{station['id']}/prices",
        json={"prices": [{"fuel_type_code": "PETROL", "price": 0}]},
        headers=auth_header(token),
    )
    assert res.status_code == 422


def test_price_upsert_updates_existing_price(client, fuel_types, db_session):
    token = _admin_token(client, db_session)
    station = create_station(client, token)

    client.put(
        f"/api/v1/stations/{station['id']}/prices",
        json={"prices": [{"fuel_type_code": "PETROL", "price": 96.5}]},
        headers=auth_header(token),
    )
    res = client.put(
        f"/api/v1/stations/{station['id']}/prices",
        json={"prices": [{"fuel_type_code": "PETROL", "price": 99.9}]},
        headers=auth_header(token),
    )
    prices = res.json()
    assert len(prices) == 1
    assert prices[0]["price"] == 99.9


def test_facilities_update_rejects_unknown_code(client, fuel_types, db_session):
    token = _admin_token(client, db_session)
    station = create_station(client, token)

    res = client.put(
        f"/api/v1/stations/{station['id']}/facilities",
        json={"facility_codes": ["JET_FUEL"]},
        headers=auth_header(token),
    )
    assert res.status_code == 422


def test_facilities_update_replaces_existing_set(client, fuel_types, db_session):
    token = _admin_token(client, db_session)
    station = create_station(client, token)

    client.put(
        f"/api/v1/stations/{station['id']}/facilities",
        json={"facility_codes": ["AIR", "WASHROOM"]},
        headers=auth_header(token),
    )
    res = client.put(
        f"/api/v1/stations/{station['id']}/facilities",
        json={"facility_codes": ["ATM"]},
        headers=auth_header(token),
    )
    assert sorted(res.json()) == ["ATM"]


def test_availability_upsert_and_read_back(client, fuel_types, db_session):
    token = _admin_token(client, db_session)
    station = create_station(client, token)

    res = client.put(
        f"/api/v1/stations/{station['id']}/availability",
        json={"availability": [{"fuel_type_code": "CNG", "is_available": False, "note": "Out of stock"}]},
        headers=auth_header(token),
    )
    assert res.status_code == 200
    assert res.json()[0]["is_available"] is False
    assert res.json()[0]["note"] == "Out of stock"


def test_favorite_toggle_on_then_off(client, fuel_types, db_session):
    token = _admin_token(client, db_session)
    station = create_station(client, token)

    customer = signup_customer(client, "+919400000002")
    headers = auth_header(customer["access_token"])

    res = client.post(f"/api/v1/stations/{station['id']}/favorite", headers=headers)
    assert res.json() == {"station_id": station["id"], "is_favorite": True}

    res = client.post(f"/api/v1/stations/{station['id']}/favorite", headers=headers)
    assert res.json() == {"station_id": station["id"], "is_favorite": False}


def test_favorites_mine_lists_only_favorited_stations(client, fuel_types, db_session):
    token = _admin_token(client, db_session)
    fav = create_station(client, token, {"name": "Favorited"})
    create_station(client, token, {"name": "NotFavorited", "latitude": 28.6, "longitude": 77.4})

    customer = signup_customer(client, "+919400000003")
    headers = auth_header(customer["access_token"])
    client.post(f"/api/v1/stations/{fav['id']}/favorite", headers=headers)

    res = client.get("/api/v1/stations/favorites/mine", headers=headers)
    names = [item["name"] for item in res.json()]
    assert names == ["Favorited"]


def test_favorite_requires_authentication(client, fuel_types, db_session):
    token = _admin_token(client, db_session)
    station = create_station(client, token)

    res = client.post(f"/api/v1/stations/{station['id']}/favorite")
    assert res.status_code == 401


def test_fuel_types_list_is_public(client, fuel_types):
    res = client.get("/api/v1/fuel-types")
    assert res.status_code == 200
    codes = {ft["code"] for ft in res.json()}
    assert codes == {"PETROL", "DIESEL", "CNG", "EV"}
