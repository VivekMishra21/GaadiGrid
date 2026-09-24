from tests.helpers import auth_header, signup_customer

VALID_ADDRESS = {
    "label": "Home",
    "line1": "H-142, Sector 62",
    "city": "Noida",
    "state": "Uttar Pradesh",
    "pincode": "201309",
}


def test_first_address_becomes_default(client):
    result = signup_customer(client, "+919400000001")
    headers = auth_header(result["access_token"])

    res = client.post("/api/v1/addresses", json=VALID_ADDRESS, headers=headers)
    assert res.status_code == 201
    assert res.json()["is_default"] is True


def test_invalid_pincode_rejected(client):
    result = signup_customer(client, "+919400000002")
    headers = auth_header(result["access_token"])

    bad = {**VALID_ADDRESS, "pincode": "12"}
    res = client.post("/api/v1/addresses", json=bad, headers=headers)
    assert res.status_code == 422


def test_deleting_default_address_promotes_another(client):
    result = signup_customer(client, "+919400000003")
    headers = auth_header(result["access_token"])

    a1 = client.post("/api/v1/addresses", json=VALID_ADDRESS, headers=headers).json()
    a2 = client.post("/api/v1/addresses", json={**VALID_ADDRESS, "label": "Work"}, headers=headers).json()

    client.delete(f"/api/v1/addresses/{a1['id']}", headers=headers)

    addresses = client.get("/api/v1/addresses", headers=headers).json()
    assert len(addresses) == 1
    assert addresses[0]["id"] == a2["id"]
    assert addresses[0]["is_default"] is True


def test_user_cannot_access_another_users_address(client):
    owner = signup_customer(client, "+919400000004")
    intruder = signup_customer(client, "+919400000005")

    address = client.post("/api/v1/addresses", json=VALID_ADDRESS, headers=auth_header(owner["access_token"])).json()

    res = client.put(
        f"/api/v1/addresses/{address['id']}", json={"city": "Hacked"}, headers=auth_header(intruder["access_token"])
    )
    assert res.status_code == 403
