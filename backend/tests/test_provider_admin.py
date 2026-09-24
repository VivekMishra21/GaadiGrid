from datetime import date, timedelta

from app.core.constants import Role
from app.models.user import User
from tests.helpers import (
    auth_header,
    create_address,
    create_package,
    create_provider,
    create_provider_owner,
    create_staff_user,
    create_vehicle,
    login_staff,
    set_full_week_availability,
    signup_customer,
)


def _admin_token(client, db_session, email="pv-admin@test.dev"):
    if not db_session.query(User).filter_by(email=email).first():
        create_staff_user(db_session, email, role=Role.ADMIN)
    return login_staff(client, email)["access_token"]


def _owner_and_provider(client, db_session, email):
    create_provider_owner(client, db_session, email)
    token = login_staff(client, email)["access_token"]
    provider = create_provider(client, token)
    return token, provider


def test_submit_verification_moves_to_pending(client, db_session):
    owner_token, provider = _owner_and_provider(client, db_session, "ver-owner1@test.dev")

    res = client.post(
        f"/api/v1/providers/{provider['id']}/verification/submit",
        json={"business_registration_number": "REG12345", "gst_number": "GST999"},
        headers=auth_header(owner_token),
    )
    assert res.status_code == 200
    body = res.json()
    assert body["verification_status"] == "PENDING"
    assert body["business_registration_number"] == "REG12345"
    assert body["verification_submitted_at"] is not None


def test_only_owner_can_submit_verification_not_admin(client, db_session):
    owner_token, provider = _owner_and_provider(client, db_session, "ver-owner2@test.dev")
    admin_token = _admin_token(client, db_session)

    res = client.post(
        f"/api/v1/providers/{provider['id']}/verification/submit",
        json={"business_registration_number": "REG1"},
        headers=auth_header(admin_token),
    )
    assert res.status_code == 403


def test_cannot_resubmit_while_already_pending(client, db_session):
    owner_token, provider = _owner_and_provider(client, db_session, "ver-owner3@test.dev")
    client.post(
        f"/api/v1/providers/{provider['id']}/verification/submit",
        json={"business_registration_number": "REG1"},
        headers=auth_header(owner_token),
    )
    res = client.post(
        f"/api/v1/providers/{provider['id']}/verification/submit",
        json={"business_registration_number": "REG2"},
        headers=auth_header(owner_token),
    )
    assert res.status_code == 409


def test_admin_can_verify_a_pending_submission(client, db_session):
    owner_token, provider = _owner_and_provider(client, db_session, "ver-owner4@test.dev")
    client.post(
        f"/api/v1/providers/{provider['id']}/verification/submit",
        json={"business_registration_number": "REG1"},
        headers=auth_header(owner_token),
    )
    admin_token = _admin_token(client, db_session)

    res = client.post(f"/api/v1/admin/providers/{provider['id']}/verify", headers=auth_header(admin_token))
    assert res.status_code == 200
    assert res.json()["verification_status"] == "VERIFIED"
    assert res.json()["verified_at"] is not None


def test_admin_can_reject_with_a_reason(client, db_session):
    owner_token, provider = _owner_and_provider(client, db_session, "ver-owner5@test.dev")
    client.post(
        f"/api/v1/providers/{provider['id']}/verification/submit",
        json={"business_registration_number": "REG1"},
        headers=auth_header(owner_token),
    )
    admin_token = _admin_token(client, db_session)

    res = client.post(
        f"/api/v1/admin/providers/{provider['id']}/reject",
        json={"reason": "Registration number could not be verified"},
        headers=auth_header(admin_token),
    )
    assert res.status_code == 200
    assert res.json()["verification_status"] == "REJECTED"
    assert res.json()["verification_notes"] == "Registration number could not be verified"


def test_cannot_verify_a_submission_that_was_never_made(client, db_session):
    owner_token, provider = _owner_and_provider(client, db_session, "ver-owner6@test.dev")
    admin_token = _admin_token(client, db_session)

    res = client.post(f"/api/v1/admin/providers/{provider['id']}/verify", headers=auth_header(admin_token))
    assert res.status_code == 409


def test_owner_can_resubmit_after_rejection(client, db_session):
    owner_token, provider = _owner_and_provider(client, db_session, "ver-owner7@test.dev")
    client.post(
        f"/api/v1/providers/{provider['id']}/verification/submit",
        json={"business_registration_number": "REG1"},
        headers=auth_header(owner_token),
    )
    admin_token = _admin_token(client, db_session)
    client.post(f"/api/v1/admin/providers/{provider['id']}/reject", json={"reason": "bad"}, headers=auth_header(admin_token))

    res = client.post(
        f"/api/v1/providers/{provider['id']}/verification/submit",
        json={"business_registration_number": "REG1-FIXED"},
        headers=auth_header(owner_token),
    )
    assert res.status_code == 200
    assert res.json()["verification_status"] == "PENDING"
    assert res.json()["business_registration_number"] == "REG1-FIXED"


def test_non_admin_cannot_verify_or_reject(client, db_session):
    owner_token, provider = _owner_and_provider(client, db_session, "ver-owner8@test.dev")

    res = client.post(f"/api/v1/admin/providers/{provider['id']}/verify", headers=auth_header(owner_token))
    assert res.status_code == 403


def test_admin_provider_listing_filters_by_verification_status(client, db_session):
    owner_token, provider = _owner_and_provider(client, db_session, "ver-owner9@test.dev")
    client.post(
        f"/api/v1/providers/{provider['id']}/verification/submit",
        json={"business_registration_number": "REG1"},
        headers=auth_header(owner_token),
    )
    admin_token = _admin_token(client, db_session)

    res = client.get("/api/v1/admin/providers", params={"verification_status": "PENDING"}, headers=auth_header(admin_token))
    assert res.status_code == 200
    ids = [p["id"] for p in res.json()["items"]]
    assert provider["id"] in ids

    res = client.get("/api/v1/admin/providers", params={"verification_status": "VERIFIED"}, headers=auth_header(admin_token))
    ids = [p["id"] for p in res.json()["items"]]
    assert provider["id"] not in ids


def test_admin_can_deactivate_and_reactivate_a_provider(client, db_session):
    owner_token, provider = _owner_and_provider(client, db_session, "ver-owner10@test.dev")
    admin_token = _admin_token(client, db_session)

    res = client.post(f"/api/v1/admin/providers/{provider['id']}/deactivate", headers=auth_header(admin_token))
    assert res.status_code == 200
    assert res.json()["is_active"] is False

    # deactivated providers drop out of public search
    res = client.get("/api/v1/providers", params={"q": "Test Car Spa"})
    ids = [p["id"] for p in res.json()["items"]]
    assert provider["id"] not in ids

    res = client.post(f"/api/v1/admin/providers/{provider['id']}/reactivate", headers=auth_header(admin_token))
    assert res.status_code == 200
    assert res.json()["is_active"] is True


def test_admin_can_deactivate_and_reactivate_a_customer(client, db_session):
    customer = signup_customer(client, "+919600000201")
    admin_token = _admin_token(client, db_session)
    user_id = customer["user"]["id"]

    res = client.post(f"/api/v1/admin/users/{user_id}/deactivate", headers=auth_header(admin_token))
    assert res.status_code == 200
    assert res.json()["is_active"] is False

    denied = client.get("/api/v1/auth/me", headers=auth_header(customer["access_token"]))
    assert denied.status_code == 403

    res = client.post(f"/api/v1/admin/users/{user_id}/reactivate", headers=auth_header(admin_token))
    assert res.status_code == 200
    assert res.json()["is_active"] is True


def test_admin_cannot_deactivate_own_account(client, db_session):
    create_staff_user(db_session, "self-lock@test.dev", role=Role.ADMIN)
    login = login_staff(client, "self-lock@test.dev")
    admin_id = login["user"]["id"]

    res = client.post(f"/api/v1/admin/users/{admin_id}/deactivate", headers=auth_header(login["access_token"]))
    assert res.status_code == 403


def test_admin_cannot_deactivate_another_admin(client, db_session):
    create_staff_user(db_session, "target-admin@test.dev", role=Role.ADMIN)
    target = login_staff(client, "target-admin@test.dev")
    admin_token = _admin_token(client, db_session)

    res = client.post(f"/api/v1/admin/users/{target['user']['id']}/deactivate", headers=auth_header(admin_token))
    assert res.status_code == 403


def test_non_admin_cannot_deactivate_users(client, db_session):
    customer = signup_customer(client, "+919600000202")
    other = signup_customer(client, "+919600000203")

    res = client.post(
        f"/api/v1/admin/users/{other['user']['id']}/deactivate", headers=auth_header(customer["access_token"])
    )
    assert res.status_code == 403


def test_admin_user_listing_filters_by_role_and_search(client, db_session):
    signup_customer(client, "+919600000204", full_name="Findable Customer")
    admin_token = _admin_token(client, db_session)

    res = client.get("/api/v1/admin/users", params={"role": "CUSTOMER", "q": "Findable"}, headers=auth_header(admin_token))
    assert res.status_code == 200
    names = [u["full_name"] for u in res.json()["items"]]
    assert "Findable Customer" in names


def test_owner_can_add_and_remove_staff(client, db_session):
    owner_token, provider = _owner_and_provider(client, db_session, "staff-owner1@test.dev")
    staff_user = create_staff_user(db_session, "staff1@test.dev", role=Role.PROVIDER_STAFF)

    res = client.post(
        f"/api/v1/providers/{provider['id']}/staff", json={"email": "staff1@test.dev"}, headers=auth_header(owner_token)
    )
    assert res.status_code == 201
    assert res.json()["user_id"] == staff_user.id

    res = client.get(f"/api/v1/providers/{provider['id']}/staff", headers=auth_header(owner_token))
    assert len(res.json()) == 1

    res = client.delete(f"/api/v1/providers/{provider['id']}/staff/{staff_user.id}", headers=auth_header(owner_token))
    assert res.status_code == 204

    res = client.get(f"/api/v1/providers/{provider['id']}/staff", headers=auth_header(owner_token))
    assert res.json() == []


def test_a_linked_staff_member_cannot_add_or_remove_other_staff(client, db_session):
    """Only the owner (or an admin) controls who has staff access — a staff account
    shouldn't be able to grant itself the ability to invite or remove other staff."""
    owner_token, provider = _owner_and_provider(client, db_session, "staff-owner1b@test.dev")
    staff_a = create_staff_user(db_session, "staff-a@test.dev", role=Role.PROVIDER_STAFF)
    create_staff_user(db_session, "staff-b@test.dev", role=Role.PROVIDER_STAFF)
    client.post(f"/api/v1/providers/{provider['id']}/staff", json={"email": "staff-a@test.dev"}, headers=auth_header(owner_token))
    staff_a_token = login_staff(client, "staff-a@test.dev")["access_token"]

    res = client.post(
        f"/api/v1/providers/{provider['id']}/staff", json={"email": "staff-b@test.dev"}, headers=auth_header(staff_a_token)
    )
    assert res.status_code == 403

    res = client.delete(f"/api/v1/providers/{provider['id']}/staff/{staff_a.id}", headers=auth_header(staff_a_token))
    assert res.status_code == 403

    # Staff can still see who's on staff, just not change it.
    res = client.get(f"/api/v1/providers/{provider['id']}/staff", headers=auth_header(staff_a_token))
    assert res.status_code == 200


def test_cannot_add_a_customer_as_staff(client, db_session):
    owner_token, provider = _owner_and_provider(client, db_session, "staff-owner2@test.dev")
    signup_customer(client, "+919600000205", full_name="Not Staff")

    customer = db_session.query(User).filter(User.full_name == "Not Staff").first()
    customer.email = "notstaff@test.dev"
    db_session.commit()

    res = client.post(
        f"/api/v1/providers/{provider['id']}/staff", json={"email": "notstaff@test.dev"}, headers=auth_header(owner_token)
    )
    assert res.status_code == 404


def test_cannot_add_staff_already_linked_elsewhere(client, db_session):
    owner_a_token, provider_a = _owner_and_provider(client, db_session, "staff-owner3a@test.dev")
    owner_b_token, provider_b = _owner_and_provider(client, db_session, "staff-owner3b@test.dev")
    create_staff_user(db_session, "shared-staff@test.dev", role=Role.PROVIDER_STAFF)

    client.post(f"/api/v1/providers/{provider_a['id']}/staff", json={"email": "shared-staff@test.dev"}, headers=auth_header(owner_a_token))

    res = client.post(
        f"/api/v1/providers/{provider_b['id']}/staff", json={"email": "shared-staff@test.dev"}, headers=auth_header(owner_b_token)
    )
    assert res.status_code == 409


def test_linked_staff_can_manage_provider_bookings(client, db_session):
    owner_token, provider = _owner_and_provider(client, db_session, "staff-owner4@test.dev")
    package = create_package(client, owner_token, provider["id"])
    set_full_week_availability(client, owner_token, provider["id"])

    create_staff_user(db_session, "acting-staff@test.dev", role=Role.PROVIDER_STAFF)
    client.post(f"/api/v1/providers/{provider['id']}/staff", json={"email": "acting-staff@test.dev"}, headers=auth_header(owner_token))
    staff_token = login_staff(client, "acting-staff@test.dev")["access_token"]

    customer = signup_customer(client, "+919600000206")
    vehicle = create_vehicle(client, customer["access_token"])
    address = create_address(client, customer["access_token"])
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    slot = client.get(
        f"/api/v1/providers/{provider['id']}/packages/{package['id']}/available-slots", params={"date": tomorrow}
    ).json()[0]

    booking = client.post(
        "/api/v1/bookings",
        json={"package_id": package["id"], "vehicle_id": vehicle["id"], "address_id": address["id"], "scheduled_at": slot},
        headers=auth_header(customer["access_token"]),
    ).json()

    # staff (not the owner) confirms the booking
    res = client.post(f"/api/v1/bookings/{booking['id']}/confirm", headers=auth_header(staff_token))
    assert res.status_code == 200
    assert res.json()["status"] == "CONFIRMED"

    # and shows up in the provider's own booking list via staff login too
    res = client.get("/api/v1/bookings/provider/mine", headers=auth_header(staff_token))
    assert res.json()["meta"]["total"] == 1


def test_staff_cannot_manage_a_different_providers_booking(client, db_session):
    owner_a_token, provider_a = _owner_and_provider(client, db_session, "staff-owner5a@test.dev")
    owner_b_token, provider_b = _owner_and_provider(client, db_session, "staff-owner5b@test.dev")

    create_staff_user(db_session, "b-staff@test.dev", role=Role.PROVIDER_STAFF)
    client.post(f"/api/v1/providers/{provider_b['id']}/staff", json={"email": "b-staff@test.dev"}, headers=auth_header(owner_b_token))
    staff_b_token = login_staff(client, "b-staff@test.dev")["access_token"]

    res = client.post(f"/api/v1/providers/{provider_a['id']}/packages", json={"category": "CAR_WASH", "name": "x", "price": 100, "duration_minutes": 30}, headers=auth_header(staff_b_token))
    assert res.status_code == 403
