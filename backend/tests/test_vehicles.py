from tests.helpers import auth_header, signup_customer

VALID_VEHICLE = {
    "vehicle_type": "CAR",
    "registration_number": "DL01AB1234",
    "brand": "Hyundai",
    "model": "i20",
    "fuel_type": "PETROL",
    "average_mileage": 18.5,
}


def test_create_vehicle_becomes_default_automatically(client):
    result = signup_customer(client, "+919300000001")
    headers = auth_header(result["access_token"])

    res = client.post("/api/v1/vehicles", json=VALID_VEHICLE, headers=headers)
    assert res.status_code == 201
    assert res.json()["is_default"] is True


def test_second_vehicle_is_not_default_unless_explicit(client):
    result = signup_customer(client, "+919300000002")
    headers = auth_header(result["access_token"])

    client.post("/api/v1/vehicles", json=VALID_VEHICLE, headers=headers)
    second = {**VALID_VEHICLE, "registration_number": "DL02CD5678"}
    res = client.post("/api/v1/vehicles", json=second, headers=headers)
    assert res.json()["is_default"] is False


def test_setting_new_default_unsets_old_default(client):
    result = signup_customer(client, "+919300000003")
    headers = auth_header(result["access_token"])

    v1 = client.post("/api/v1/vehicles", json=VALID_VEHICLE, headers=headers).json()
    second = {**VALID_VEHICLE, "registration_number": "DL02CD5678", "is_default": True}
    v2 = client.post("/api/v1/vehicles", json=second, headers=headers).json()

    assert v2["is_default"] is True

    v1_after = client.get(f"/api/v1/vehicles/{v1['id']}", headers=headers).json()
    assert v1_after["is_default"] is False


def test_deleting_default_promotes_another_vehicle(client):
    result = signup_customer(client, "+919300000004")
    headers = auth_header(result["access_token"])

    v1 = client.post("/api/v1/vehicles", json=VALID_VEHICLE, headers=headers).json()
    second = {**VALID_VEHICLE, "registration_number": "DL02CD5678"}
    v2 = client.post("/api/v1/vehicles", json=second, headers=headers).json()

    assert v1["is_default"] is True
    assert v2["is_default"] is False

    del_res = client.delete(f"/api/v1/vehicles/{v1['id']}", headers=headers)
    assert del_res.status_code == 204

    v2_after = client.get(f"/api/v1/vehicles/{v2['id']}", headers=headers).json()
    assert v2_after["is_default"] is True


def test_deleted_vehicle_no_longer_listed(client):
    result = signup_customer(client, "+919300000005")
    headers = auth_header(result["access_token"])

    v1 = client.post("/api/v1/vehicles", json=VALID_VEHICLE, headers=headers).json()
    client.delete(f"/api/v1/vehicles/{v1['id']}", headers=headers)

    res = client.get("/api/v1/vehicles", headers=headers)
    assert res.json() == []


def test_user_cannot_access_another_users_vehicle(client):
    owner = signup_customer(client, "+919300000006")
    intruder = signup_customer(client, "+919300000007")

    vehicle = client.post("/api/v1/vehicles", json=VALID_VEHICLE, headers=auth_header(owner["access_token"])).json()

    res = client.get(f"/api/v1/vehicles/{vehicle['id']}", headers=auth_header(intruder["access_token"]))
    assert res.status_code == 403

    res = client.put(
        f"/api/v1/vehicles/{vehicle['id']}", json={"brand": "Hacked"}, headers=auth_header(intruder["access_token"])
    )
    assert res.status_code == 403

    res = client.delete(f"/api/v1/vehicles/{vehicle['id']}", headers=auth_header(intruder["access_token"]))
    assert res.status_code == 403


def test_invalid_registration_number_rejected(client):
    result = signup_customer(client, "+919300000008")
    headers = auth_header(result["access_token"])

    bad = {**VALID_VEHICLE, "registration_number": "not-a-plate"}
    res = client.post("/api/v1/vehicles", json=bad, headers=headers)
    assert res.status_code == 422


def test_unrealistic_mileage_rejected(client):
    result = signup_customer(client, "+919300000009")
    headers = auth_header(result["access_token"])

    bad = {**VALID_VEHICLE, "average_mileage": 5000}
    res = client.post("/api/v1/vehicles", json=bad, headers=headers)
    assert res.status_code == 422


def test_invalid_fuel_type_rejected(client):
    result = signup_customer(client, "+919300000010")
    headers = auth_header(result["access_token"])

    bad = {**VALID_VEHICLE, "fuel_type": "UNOBTAINIUM"}
    res = client.post("/api/v1/vehicles", json=bad, headers=headers)
    assert res.status_code == 422


def test_duplicate_registration_for_same_owner_rejected(client):
    result = signup_customer(client, "+919300000011")
    headers = auth_header(result["access_token"])

    client.post("/api/v1/vehicles", json=VALID_VEHICLE, headers=headers)
    res = client.post("/api/v1/vehicles", json=VALID_VEHICLE, headers=headers)
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "conflict"


def test_update_vehicle_partial_fields(client):
    result = signup_customer(client, "+919300000012")
    headers = auth_header(result["access_token"])

    v1 = client.post("/api/v1/vehicles", json=VALID_VEHICLE, headers=headers).json()
    res = client.put(f"/api/v1/vehicles/{v1['id']}", json={"model": "i20 N Line"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["model"] == "i20 N Line"
    assert res.json()["brand"] == "Hyundai"
