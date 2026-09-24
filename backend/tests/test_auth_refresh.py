from tests.helpers import auth_header, signup_customer


def test_refresh_rotation_happy_path(client):
    result = signup_customer(client, "+919100000001")
    refresh1 = result["refresh_token"]

    res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh1})
    assert res.status_code == 200
    body = res.json()
    assert body["access_token"]
    assert body["refresh_token"] != refresh1


def test_refresh_reuse_detected_revokes_whole_family(client):
    result = signup_customer(client, "+919100000002")
    refresh1 = result["refresh_token"]

    rotate1 = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh1}).json()
    refresh2 = rotate1["refresh_token"]

    replay = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh1})
    assert replay.status_code == 401
    assert replay.json()["error"]["code"] == "refresh_token_reuse_detected"

    also_dead = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh2})
    assert also_dead.status_code == 401
    assert also_dead.json()["error"]["code"] == "refresh_token_reuse_detected"


def test_invalid_refresh_token_rejected(client):
    res = client.post("/api/v1/auth/refresh", json={"refresh_token": "not-a-real-token"})
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "refresh_token_invalid"


def test_access_token_cannot_be_used_as_refresh_token(client):
    result = signup_customer(client, "+919100000003")
    access = result["access_token"]

    res = client.post("/api/v1/auth/refresh", json={"refresh_token": access})
    assert res.status_code == 401


def test_login_sets_an_httponly_refresh_cookie(client):
    signup_customer(client, "+919100000004")
    cookie = client.cookies.get("gaadigrid_refresh_token")
    assert cookie is not None


def test_refresh_works_from_cookie_alone_with_no_body_token(client):
    """A browser client (admin-web/provider-web) never sends the refresh token in the
    request body — it relies entirely on the httpOnly cookie the login response set."""
    signup_customer(client, "+919100000005")

    res = client.post("/api/v1/auth/refresh", json={})
    assert res.status_code == 200
    assert res.json()["access_token"]


def test_refresh_with_no_body_token_and_no_cookie_is_rejected(client):
    res = client.post("/api/v1/auth/refresh", json={})
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "refresh_token_invalid"


def test_refresh_is_rate_limited(client):
    signup_customer(client, "+919100000006")

    responses = [client.post("/api/v1/auth/refresh", json={}) for _ in range(35)]
    assert any(r.status_code == 429 for r in responses)


def test_logout_clears_the_refresh_cookie(client):
    result = signup_customer(client, "+919100000007")
    assert client.cookies.get("gaadigrid_refresh_token") is not None

    res = client.post("/api/v1/auth/logout", json={}, headers=auth_header(result["access_token"]))
    assert res.status_code == 204
    assert client.cookies.get("gaadigrid_refresh_token") is None

    # The revoked cookie-carried token can no longer refresh a session.
    replay = client.post("/api/v1/auth/refresh", json={"refresh_token": result["refresh_token"]})
    assert replay.status_code == 401
