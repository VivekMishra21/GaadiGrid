from tests.helpers import auth_header, signup_customer


def test_update_profile_full_name(client):
    result = signup_customer(client, "+919500000001", "Original Name")
    headers = auth_header(result["access_token"])

    res = client.put("/api/v1/users/me", json={"full_name": "Updated Name"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["full_name"] == "Updated Name"


def test_email_uniqueness_enforced_on_profile_update(client):
    user_a = signup_customer(client, "+919500000002")
    user_b = signup_customer(client, "+919500000003")

    client.put("/api/v1/users/me", json={"email": "shared@test.dev"}, headers=auth_header(user_a["access_token"]))

    res = client.put(
        "/api/v1/users/me", json={"email": "shared@test.dev"}, headers=auth_header(user_b["access_token"])
    )
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "conflict"
