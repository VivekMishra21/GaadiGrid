from datetime import date, timedelta

from tests.helpers import auth_header, create_vehicle, signup_customer


def test_reminders_list_is_scoped_to_the_current_user(client, db_session):
    customer = signup_customer(client, "+919821000001")
    token = customer["access_token"]
    create_vehicle(
        client,
        token,
        {
            "registration_number": "DL01AB9999",
            "insurance_expiry": (date.today() + timedelta(days=5)).isoformat(),
        },
    )

    other = signup_customer(client, "+919821000002")
    create_vehicle(
        client,
        other["access_token"],
        {"registration_number": "DL01AB8888", "puc_expiry": (date.today() + timedelta(days=3)).isoformat()},
    )

    res = client.get("/api/v1/vehicles/reminders", headers=auth_header(token))
    assert res.status_code == 200
    reminders = res.json()
    assert len(reminders) == 1
    assert reminders[0]["type"] == "insurance"
    assert reminders[0]["urgency"] == "DUE_SOON"


def test_reminders_across_multiple_vehicles_are_sorted_by_urgency(client, db_session):
    customer = signup_customer(client, "+919821000003")
    token = customer["access_token"]
    create_vehicle(
        client,
        token,
        {
            "registration_number": "DL01AB1111",
            "service_due_date": (date.today() + timedelta(days=100)).isoformat(),
        },
    )
    create_vehicle(
        client,
        token,
        {
            "registration_number": "DL01AB2222",
            "insurance_expiry": (date.today() - timedelta(days=2)).isoformat(),
        },
    )

    res = client.get("/api/v1/vehicles/reminders", headers=auth_header(token))
    reminders = res.json()
    assert len(reminders) == 2
    assert reminders[0]["registration_number"] == "DL01AB2222"
    assert reminders[0]["urgency"] == "OVERDUE"


def test_vehicle_with_no_reminder_dates_contributes_nothing(client, db_session):
    customer = signup_customer(client, "+919821000004")
    token = customer["access_token"]
    create_vehicle(client, token, {"registration_number": "DL01AB3333"})

    res = client.get("/api/v1/vehicles/reminders", headers=auth_header(token))
    assert res.json() == []
