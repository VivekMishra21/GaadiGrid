from app.core.constants import Role
from app.models.user import User
from tests.helpers import auth_header, create_staff_user, login_staff, signup_customer

ADMIN_EMAIL = "qr-admin@gaadigrid.dev"
PROVIDER_EMAIL = "qr-provider@gaadigrid.dev"

STATION_LAT = 28.5708
STATION_LNG = 77.3260


def _admin_token(client, db_session):
    # Idempotent: some tests need a second station created with the same admin
    # within one test, so this must be safe to call more than once per test.
    if not db_session.query(User).filter(User.email == ADMIN_EMAIL).first():
        create_staff_user(db_session, ADMIN_EMAIL)
    return login_staff(client, ADMIN_EMAIL)["access_token"]


def _station(client, db_session):
    token = _admin_token(client, db_session)
    return client.post(
        "/api/v1/stations",
        json={
            "name": "QR Test Station",
            "brand": "Indian Oil",
            "address": "Sector 1, Noida",
            "city": "Noida",
            "latitude": STATION_LAT,
            "longitude": STATION_LNG,
            "is_24_hours": True,
        },
        headers=auth_header(token),
    ).json()


def test_customer_report_is_not_marked_verified(client, fuel_types, db_session):
    station = _station(client, db_session)
    customer = signup_customer(client, "+919500000001")
    headers = auth_header(customer["access_token"])

    res = client.post(
        f"/api/v1/stations/{station['id']}/queue-reports",
        json={"report_type": "NO_QUEUE", "latitude": STATION_LAT, "longitude": STATION_LNG},
        headers=headers,
    )
    assert res.status_code == 201
    assert res.json()["is_verified_partner_report"] is False


def test_provider_report_is_marked_verified(client, fuel_types, db_session):
    station = _station(client, db_session)
    create_staff_user(db_session, PROVIDER_EMAIL, role=Role.PROVIDER_OWNER)
    login = login_staff(client, PROVIDER_EMAIL)
    headers = auth_header(login["access_token"])

    res = client.post(
        f"/api/v1/stations/{station['id']}/queue-reports",
        json={"report_type": "WAIT_5_10", "latitude": STATION_LAT, "longitude": STATION_LNG},
        headers=headers,
    )
    assert res.status_code == 201
    assert res.json()["is_verified_partner_report"] is True


def test_report_updates_station_queue_status(client, fuel_types, db_session):
    station = _station(client, db_session)
    customer = signup_customer(client, "+919500000002")
    headers = auth_header(customer["access_token"])

    client.post(
        f"/api/v1/stations/{station['id']}/queue-reports",
        json={"report_type": "WAIT_10_20", "latitude": STATION_LAT, "longitude": STATION_LNG},
        headers=headers,
    )

    res = client.get(f"/api/v1/stations/{station['id']}")
    assert res.json()["queue_status"]["queue"]["value"] == "WAIT_10_20"


def test_report_rejected_when_reporter_too_far_from_station(client, fuel_types, db_session):
    station = _station(client, db_session)
    customer = signup_customer(client, "+919500000003")
    headers = auth_header(customer["access_token"])

    res = client.post(
        f"/api/v1/stations/{station['id']}/queue-reports",
        json={"report_type": "NO_QUEUE", "latitude": 10.0, "longitude": 10.0},
        headers=headers,
    )
    assert res.status_code in (400, 422)


def test_report_allowed_without_location(client, fuel_types, db_session):
    station = _station(client, db_session)
    customer = signup_customer(client, "+919500000004")
    headers = auth_header(customer["access_token"])

    res = client.post(
        f"/api/v1/stations/{station['id']}/queue-reports",
        json={"report_type": "NO_QUEUE"},
        headers=headers,
    )
    assert res.status_code == 201


def test_second_report_within_cooldown_is_rejected(client, fuel_types, db_session):
    station = _station(client, db_session)
    customer = signup_customer(client, "+919500000005")
    headers = auth_header(customer["access_token"])

    first = client.post(
        f"/api/v1/stations/{station['id']}/queue-reports",
        json={"report_type": "NO_QUEUE", "latitude": STATION_LAT, "longitude": STATION_LNG},
        headers=headers,
    )
    assert first.status_code == 201

    second = client.post(
        f"/api/v1/stations/{station['id']}/queue-reports",
        json={"report_type": "WAIT_5_10", "latitude": STATION_LAT, "longitude": STATION_LNG},
        headers=headers,
    )
    assert second.status_code == 409


def test_cooldown_is_per_station(client, fuel_types, db_session):
    station_a = _station(client, db_session)
    token = _admin_token(client, db_session)
    station_b = client.post(
        "/api/v1/stations",
        json={
            "name": "QR Test Station B",
            "brand": "HP",
            "address": "Sector 2, Noida",
            "city": "Noida",
            "latitude": 28.6,
            "longitude": 77.4,
            "is_24_hours": True,
        },
        headers=auth_header(token),
    ).json()

    customer = signup_customer(client, "+919500000006")
    headers = auth_header(customer["access_token"])

    res_a = client.post(
        f"/api/v1/stations/{station_a['id']}/queue-reports",
        json={"report_type": "NO_QUEUE", "latitude": STATION_LAT, "longitude": STATION_LNG},
        headers=headers,
    )
    res_b = client.post(
        f"/api/v1/stations/{station_b['id']}/queue-reports",
        json={"report_type": "NO_QUEUE", "latitude": 28.6, "longitude": 77.4},
        headers=headers,
    )
    assert res_a.status_code == 201
    assert res_b.status_code == 201


def test_invalid_report_type_rejected(client, fuel_types, db_session):
    station = _station(client, db_session)
    customer = signup_customer(client, "+919500000007")
    headers = auth_header(customer["access_token"])

    res = client.post(
        f"/api/v1/stations/{station['id']}/queue-reports",
        json={"report_type": "NOT_A_REAL_TYPE"},
        headers=headers,
    )
    assert res.status_code == 422


def test_list_recent_reports_for_unknown_station_is_404(client, fuel_types):
    res = client.get("/api/v1/stations/999999/queue-reports")
    assert res.status_code == 404


def test_user_cannot_flag_own_report(client, fuel_types, db_session):
    station = _station(client, db_session)
    customer = signup_customer(client, "+919500000008")
    headers = auth_header(customer["access_token"])

    report = client.post(
        f"/api/v1/stations/{station['id']}/queue-reports",
        json={"report_type": "NO_QUEUE", "latitude": STATION_LAT, "longitude": STATION_LNG},
        headers=headers,
    ).json()

    res = client.post(f"/api/v1/queue-reports/{report['id']}/flag", headers=headers)
    assert res.status_code == 403


def test_other_user_can_flag_report_and_it_increments_count(client, fuel_types, db_session):
    station = _station(client, db_session)
    reporter = signup_customer(client, "+919500000009")
    flagger = signup_customer(client, "+919500000010")

    report = client.post(
        f"/api/v1/stations/{station['id']}/queue-reports",
        json={"report_type": "NO_QUEUE", "latitude": STATION_LAT, "longitude": STATION_LNG},
        headers=auth_header(reporter["access_token"]),
    ).json()

    res = client.post(f"/api/v1/queue-reports/{report['id']}/flag", headers=auth_header(flagger["access_token"]))
    assert res.status_code == 204

    listing = client.get(f"/api/v1/stations/{station['id']}/queue-reports")
    flagged = next(r for r in listing.json() if r["id"] == report["id"])
    assert flagged["flag_count"] == 1


def test_duplicate_flag_by_same_user_is_rejected(client, fuel_types, db_session):
    station = _station(client, db_session)
    reporter = signup_customer(client, "+919500000011")
    flagger = signup_customer(client, "+919500000012")

    report = client.post(
        f"/api/v1/stations/{station['id']}/queue-reports",
        json={"report_type": "NO_QUEUE", "latitude": STATION_LAT, "longitude": STATION_LNG},
        headers=auth_header(reporter["access_token"]),
    ).json()

    client.post(f"/api/v1/queue-reports/{report['id']}/flag", headers=auth_header(flagger["access_token"]))
    res = client.post(f"/api/v1/queue-reports/{report['id']}/flag", headers=auth_header(flagger["access_token"]))
    assert res.status_code == 409


def test_flagging_past_threshold_removes_report_from_combined_status(client, fuel_types, db_session):
    station = _station(client, db_session)
    reporter = signup_customer(client, "+919500000013")
    flagger_a = signup_customer(client, "+919500000014")
    flagger_b = signup_customer(client, "+919500000015")

    report = client.post(
        f"/api/v1/stations/{station['id']}/queue-reports",
        json={"report_type": "WAIT_30_PLUS", "latitude": STATION_LAT, "longitude": STATION_LNG},
        headers=auth_header(reporter["access_token"]),
    ).json()

    before = client.get(f"/api/v1/stations/{station['id']}")
    assert before.json()["queue_status"]["queue"]["value"] == "WAIT_30_PLUS"

    client.post(f"/api/v1/queue-reports/{report['id']}/flag", headers=auth_header(flagger_a["access_token"]))
    client.post(f"/api/v1/queue-reports/{report['id']}/flag", headers=auth_header(flagger_b["access_token"]))

    after = client.get(f"/api/v1/stations/{station['id']}")
    assert after.json()["queue_status"]["queue"]["value"] is None


def test_flag_unknown_report_is_404(client, fuel_types, db_session):
    customer = signup_customer(client, "+919500000016")
    res = client.post("/api/v1/queue-reports/999999/flag", headers=auth_header(customer["access_token"]))
    assert res.status_code == 404


def test_queue_report_requires_authentication(client, fuel_types, db_session):
    station = _station(client, db_session)
    res = client.post(
        f"/api/v1/stations/{station['id']}/queue-reports",
        json={"report_type": "NO_QUEUE"},
    )
    assert res.status_code == 401
