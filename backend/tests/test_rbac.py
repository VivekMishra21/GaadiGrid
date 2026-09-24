from app.core.constants import Role
from tests.helpers import auth_header, create_staff_user, login_staff, signup_customer


def test_customer_denied_admin_endpoint(client):
    result = signup_customer(client, "+919200000001")
    res = client.get("/api/v1/admin/users", headers=auth_header(result["access_token"]))
    assert res.status_code == 403


def test_admin_allowed_admin_endpoint(client, db_session):
    create_staff_user(db_session, "admin1@test.dev", role=Role.ADMIN)
    login = login_staff(client, "admin1@test.dev")
    res = client.get("/api/v1/admin/users", headers=auth_header(login["access_token"]))
    assert res.status_code == 200
    assert "items" in res.json()
    assert "meta" in res.json()


def test_super_admin_allowed_admin_endpoint(client, db_session):
    create_staff_user(db_session, "sa1@test.dev", role=Role.SUPER_ADMIN)
    login = login_staff(client, "sa1@test.dev")
    res = client.get("/api/v1/admin/users", headers=auth_header(login["access_token"]))
    assert res.status_code == 200


def test_provider_owner_denied_admin_endpoint(client, db_session):
    create_staff_user(db_session, "owner1@test.dev", role=Role.PROVIDER_OWNER)
    login = login_staff(client, "owner1@test.dev")
    res = client.get("/api/v1/admin/users", headers=auth_header(login["access_token"]))
    assert res.status_code == 403


def test_unauthenticated_request_rejected(client):
    res = client.get("/api/v1/admin/users")
    assert res.status_code == 401


def test_deactivated_user_denied(client, db_session):
    result = signup_customer(client, "+919200000002")

    from app.models.user import User

    user = db_session.query(User).filter(User.id == result["user"]["id"]).first()
    user.is_active = False
    db_session.commit()

    res = client.get("/api/v1/auth/me", headers=auth_header(result["access_token"]))
    assert res.status_code == 403


def test_staff_login_wrong_password_rejected(client, db_session):
    create_staff_user(db_session, "wrongpw@test.dev", role=Role.ADMIN)
    res = client.post("/api/v1/auth/staff-login", json={"email": "wrongpw@test.dev", "password": "incorrect"})
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "invalid_credentials"


def test_role_change_takes_effect_immediately_without_reissuing_token(client, db_session):
    create_staff_user(db_session, "promote@test.dev", role=Role.PROVIDER_OWNER)
    login = login_staff(client, "promote@test.dev")
    access = login["access_token"]

    denied = client.get("/api/v1/admin/users", headers=auth_header(access))
    assert denied.status_code == 403

    from app.models.user import User

    user = db_session.query(User).filter(User.email == "promote@test.dev").first()
    user.role = Role.ADMIN
    db_session.commit()

    allowed = client.get("/api/v1/admin/users", headers=auth_header(access))
    assert allowed.status_code == 200
