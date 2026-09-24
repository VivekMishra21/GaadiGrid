from app.core.constants import Role
from app.core.security import hash_password
from app.models.user import User

DEFAULT_PASSWORD = "GaadiGrid@Dev123"


def create_staff_user(db_session, email, role=Role.ADMIN, password=DEFAULT_PASSWORD):
    user = User(email=email, password_hash=hash_password(password), full_name=f"Test {role}", role=role)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def request_otp(client, phone):
    res = client.post("/api/v1/auth/otp/request", json={"phone": phone})
    assert res.status_code == 200, res.text
    return res.json()["dev_otp"]


def signup_customer(client, phone, full_name="Test Customer"):
    otp = request_otp(client, phone)
    res = client.post(
        "/api/v1/auth/otp/verify",
        json={
            "phone": phone,
            "otp": otp,
            "full_name": full_name,
            "consents": [{"consent_type": "terms_of_service"}, {"consent_type": "privacy_policy"}],
        },
    )
    assert res.status_code == 200, res.text
    return res.json()


def login_staff(client, email, password="GaadiGrid@Dev123"):
    res = client.post("/api/v1/auth/staff-login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return res.json()


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


DEFAULT_STATION = {
    "name": "Test Station",
    "brand": "Indian Oil",
    "address": "Sector 1, Noida",
    "city": "Noida",
    "locality": "Sector 1",
    "latitude": 28.5708,
    "longitude": 77.3260,
    "is_24_hours": True,
}


def create_station(client, admin_token, overrides=None):
    payload = {**DEFAULT_STATION, **(overrides or {})}
    res = client.post("/api/v1/stations", json=payload, headers=auth_header(admin_token))
    assert res.status_code == 201, res.text
    return res.json()


DEFAULT_PROVIDER = {
    "business_name": "Test Car Spa",
    "description": "Test provider",
    "phone": "+919811111111",
    "address": "Sector 5, Noida",
    "city": "Noida",
    "locality": "Sector 5",
    "latitude": 28.58,
    "longitude": 77.32,
}


def create_provider_owner(client, db_session, email):
    from app.core.constants import Role

    return create_staff_user(db_session, email, role=Role.PROVIDER_OWNER)


def create_provider(client, owner_token, overrides=None):
    payload = {**DEFAULT_PROVIDER, **(overrides or {})}
    res = client.post("/api/v1/providers", json=payload, headers=auth_header(owner_token))
    assert res.status_code == 201, res.text
    return res.json()


DEFAULT_PACKAGE = {
    "category": "CAR_WASH",
    "name": "Basic Wash",
    "description": "Exterior wash",
    "price": 299.0,
    "duration_minutes": 60,
    "is_doorstep": True,
}


def create_package(client, owner_token, provider_id, overrides=None):
    payload = {**DEFAULT_PACKAGE, **(overrides or {})}
    res = client.post(f"/api/v1/providers/{provider_id}/packages", json=payload, headers=auth_header(owner_token))
    assert res.status_code == 201, res.text
    return res.json()


def set_full_week_availability(client, owner_token, provider_id, opens="09:00:00", closes="18:00:00"):
    days = [{"day_of_week": d, "opens_at": opens, "closes_at": closes} for d in range(7)]
    res = client.put(f"/api/v1/providers/{provider_id}/availability", json={"days": days}, headers=auth_header(owner_token))
    assert res.status_code == 200, res.text
    return res.json()


DEFAULT_VEHICLE = {
    "vehicle_type": "CAR",
    "registration_number": "DL01AB1234",
    "brand": "Hyundai",
    "model": "i20",
    "fuel_type": "PETROL",
    "average_mileage": 18.5,
}


def create_vehicle(client, customer_token, overrides=None):
    payload = {**DEFAULT_VEHICLE, **(overrides or {})}
    res = client.post("/api/v1/vehicles", json=payload, headers=auth_header(customer_token))
    assert res.status_code == 201, res.text
    return res.json()


DEFAULT_ADDRESS = {
    "label": "Home",
    "line1": "H-1, Sector 62",
    "city": "Noida",
    "state": "Uttar Pradesh",
    "pincode": "201309",
}


def create_address(client, customer_token, overrides=None):
    payload = {**DEFAULT_ADDRESS, **(overrides or {})}
    res = client.post("/api/v1/addresses", json=payload, headers=auth_header(customer_token))
    assert res.status_code == 201, res.text
    return res.json()
