from datetime import date, timedelta

from app.services.notification_service import notify_user, run_reminder_sweep
from tests.helpers import auth_header, create_vehicle, signup_customer


def test_registering_and_unregistering_a_push_token(client, db_session):
    customer = signup_customer(client, "+919822000001")
    token = customer["access_token"]

    res = client.post("/api/v1/notifications/push-token", json={"token": "ExpoToken[abc]", "platform": "ANDROID"}, headers=auth_header(token))
    assert res.status_code == 204

    # Re-registering the same token (e.g. re-login on the same device) does not error.
    res = client.post("/api/v1/notifications/push-token", json={"token": "ExpoToken[abc]", "platform": "ANDROID"}, headers=auth_header(token))
    assert res.status_code == 204

    res = client.request("DELETE", "/api/v1/notifications/push-token", json={"token": "ExpoToken[abc]"}, headers=auth_header(token))
    assert res.status_code == 204


def test_notify_user_creates_a_listable_notification(client, db_session):
    customer = signup_customer(client, "+919822000002")
    token = customer["access_token"]
    user_id = customer["user"]["id"]

    notify_user(db_session, user_id, "GENERIC", "Hello", "This is a test notification")

    res = client.get("/api/v1/notifications", headers=auth_header(token))
    assert res.status_code == 200
    body = res.json()
    assert body["meta"]["total"] == 1
    assert body["items"][0]["title"] == "Hello"
    assert body["items"][0]["read_at"] is None


def test_unread_count_and_mark_read(client, db_session):
    customer = signup_customer(client, "+919822000003")
    token = customer["access_token"]
    user_id = customer["user"]["id"]

    notify_user(db_session, user_id, "GENERIC", "First", "body")
    notify_user(db_session, user_id, "GENERIC", "Second", "body")

    res = client.get("/api/v1/notifications/unread-count", headers=auth_header(token))
    assert res.json()["unread_count"] == 2

    notification_id = client.get("/api/v1/notifications", headers=auth_header(token)).json()["items"][0]["id"]
    res = client.post(f"/api/v1/notifications/{notification_id}/read", headers=auth_header(token))
    assert res.status_code == 200
    assert res.json()["read_at"] is not None

    res = client.get("/api/v1/notifications/unread-count", headers=auth_header(token))
    assert res.json()["unread_count"] == 1

    res = client.post("/api/v1/notifications/read-all", headers=auth_header(token))
    assert res.status_code == 204
    res = client.get("/api/v1/notifications/unread-count", headers=auth_header(token))
    assert res.json()["unread_count"] == 0


def test_cannot_mark_someone_elses_notification_read(client, db_session):
    a = signup_customer(client, "+919822000004")
    b = signup_customer(client, "+919822000005")
    notify_user(db_session, a["user"]["id"], "GENERIC", "Private", "body")

    notification_id = client.get("/api/v1/notifications", headers=auth_header(a["access_token"])).json()["items"][0]["id"]
    res = client.post(f"/api/v1/notifications/{notification_id}/read", headers=auth_header(b["access_token"]))
    assert res.status_code == 403


def test_unread_only_filter(client, db_session):
    customer = signup_customer(client, "+919822000006")
    token = customer["access_token"]
    user_id = customer["user"]["id"]
    notify_user(db_session, user_id, "GENERIC", "A", "body")
    notify_user(db_session, user_id, "GENERIC", "B", "body")

    notification_id = client.get("/api/v1/notifications", headers=auth_header(token)).json()["items"][0]["id"]
    client.post(f"/api/v1/notifications/{notification_id}/read", headers=auth_header(token))

    res = client.get("/api/v1/notifications", params={"unread_only": True}, headers=auth_header(token))
    assert res.json()["meta"]["total"] == 1


def test_reminder_sweep_creates_a_notification_for_a_due_soon_vehicle(client, db_session):
    customer = signup_customer(client, "+919822000007")
    token = customer["access_token"]
    create_vehicle(
        client,
        token,
        {"registration_number": "DL01AB4444", "insurance_expiry": (date.today() + timedelta(days=5)).isoformat()},
    )

    created = run_reminder_sweep(db_session)
    assert created == 1

    res = client.get("/api/v1/notifications", headers=auth_header(token))
    assert res.json()["meta"]["total"] == 1
    assert res.json()["items"][0]["type"] == "REMINDER_INSURANCE"


def test_reminder_sweep_is_idempotent(client, db_session):
    customer = signup_customer(client, "+919822000008")
    token = customer["access_token"]
    create_vehicle(
        client,
        token,
        {"registration_number": "DL01AB5555", "insurance_expiry": (date.today() + timedelta(days=5)).isoformat()},
    )

    first_run = run_reminder_sweep(db_session)
    second_run = run_reminder_sweep(db_session)
    assert first_run == 1
    assert second_run == 0

    res = client.get("/api/v1/notifications", headers=auth_header(token))
    assert res.json()["meta"]["total"] == 1
