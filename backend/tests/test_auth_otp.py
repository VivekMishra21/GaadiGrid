from app.core.redis_client import get_redis
from tests.helpers import auth_header, request_otp, signup_customer


def test_signup_creates_new_customer(client):
    result = signup_customer(client, "+919000000001", "Alice Test")
    assert result["user"]["role"] == "CUSTOMER"
    assert result["user"]["full_name"] == "Alice Test"
    assert result["user"]["phone"] == "+919000000001"
    assert result["access_token"]
    assert result["refresh_token"]


def test_signup_requires_full_name_for_new_user(client):
    otp = request_otp(client, "+919000000002")
    res = client.post("/api/v1/auth/otp/verify", json={"phone": "+919000000002", "otp": otp})
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "validation_error"


def test_signup_requires_both_consents(client):
    otp = request_otp(client, "+919000000003")
    res = client.post(
        "/api/v1/auth/otp/verify",
        json={
            "phone": "+919000000003",
            "otp": otp,
            "full_name": "No Consent User",
            "consents": [{"consent_type": "terms_of_service"}],
        },
    )
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "validation_error"


def test_missing_full_name_does_not_consume_the_otp(client):
    """A new user who forgets to fill in full_name shouldn't have their OTP burned —
    they should be able to resubmit the SAME OTP once they add their name."""
    phone = "+919000000012"
    otp = request_otp(client, phone)

    rejected = client.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": otp})
    assert rejected.status_code == 422

    retried = client.post(
        "/api/v1/auth/otp/verify",
        json={
            "phone": phone,
            "otp": otp,
            "full_name": "Second Attempt User",
            "consents": [{"consent_type": "terms_of_service"}, {"consent_type": "privacy_policy"}],
        },
    )
    assert retried.status_code == 200
    assert retried.json()["user"]["full_name"] == "Second Attempt User"


def test_returning_user_logs_in_without_full_name(client):
    phone = "+919000000004"
    signup_customer(client, phone, "Returning User")
    get_redis().delete(f"otp:cooldown:{phone}")
    otp = request_otp(client, phone)
    res = client.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": otp})
    assert res.status_code == 200
    assert res.json()["user"]["full_name"] == "Returning User"


NEW_USER_FIELDS = {
    "full_name": "Test User",
    "consents": [{"consent_type": "terms_of_service"}, {"consent_type": "privacy_policy"}],
}


def test_wrong_otp_is_rejected_and_decrements_attempts(client):
    request_otp(client, "+919000000005")
    res = client.post(
        "/api/v1/auth/otp/verify", json={"phone": "+919000000005", "otp": "000000", **NEW_USER_FIELDS}
    )
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "otp_incorrect"
    assert "attempt" in res.json()["error"]["message"].lower()


def test_otp_max_attempts_exceeded(client):
    request_otp(client, "+919000000006")
    for _ in range(5):
        res = client.post(
            "/api/v1/auth/otp/verify", json={"phone": "+919000000006", "otp": "000000", **NEW_USER_FIELDS}
        )
    assert res.status_code == 429
    assert res.json()["error"]["code"] == "otp_attempts_exceeded"


def test_otp_resend_cooldown(client):
    request_otp(client, "+919000000007")
    res = client.post("/api/v1/auth/otp/request", json={"phone": "+919000000007"})
    assert res.status_code == 429
    assert res.json()["error"]["code"] == "otp_resend_cooldown"


def test_otp_hourly_rate_limit(client):
    phone = "+919000000008"
    for _ in range(5):
        get_redis().delete(f"otp:cooldown:{phone}")
        request_otp(client, phone)

    get_redis().delete(f"otp:cooldown:{phone}")
    res = client.post("/api/v1/auth/otp/request", json={"phone": phone})
    assert res.status_code == 429
    assert res.json()["error"]["code"] == "otp_rate_limited"


def test_invalid_phone_number_rejected(client):
    res = client.post("/api/v1/auth/otp/request", json={"phone": "not-a-phone"})
    assert res.status_code == 422


def test_no_pending_otp_rejected(client):
    res = client.post(
        "/api/v1/auth/otp/verify", json={"phone": "+919000000009", "otp": "123456", **NEW_USER_FIELDS}
    )
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "otp_not_found"


def test_logout_revokes_refresh_token(client):
    result = signup_customer(client, "+919000000010")
    access, refresh = result["access_token"], result["refresh_token"]

    res = client.post("/api/v1/auth/logout", json={"refresh_token": refresh}, headers=auth_header(access))
    assert res.status_code == 204

    res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert res.status_code == 401


def test_delete_account_request_sets_flag(client, db_session):
    result = signup_customer(client, "+919000000011")
    access = result["access_token"]

    res = client.post("/api/v1/auth/delete-account", json={"reason": "testing"}, headers=auth_header(access))
    assert res.status_code == 204

    from app.models.user import User

    user = db_session.query(User).filter(User.id == result["user"]["id"]).first()
    assert user.delete_requested_at is not None
