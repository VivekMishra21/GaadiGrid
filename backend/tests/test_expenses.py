from tests.helpers import auth_header, create_vehicle, signup_customer


def _customer_and_vehicle(client, phone="+919820000001"):
    customer = signup_customer(client, phone)
    token = customer["access_token"]
    vehicle = create_vehicle(client, token)
    return token, vehicle


def test_create_and_list_expense(client, db_session):
    token, vehicle = _customer_and_vehicle(client)
    res = client.post(
        f"/api/v1/vehicles/{vehicle['id']}/expenses",
        json={"category": "FUEL", "amount": 500.0, "expense_date": "2026-01-05", "note": "Petrol fill-up"},
        headers=auth_header(token),
    )
    assert res.status_code == 201, res.text
    expense = res.json()
    assert expense["amount"] == 500.0
    assert expense["category"] == "FUEL"

    res = client.get(f"/api/v1/vehicles/{vehicle['id']}/expenses", headers=auth_header(token))
    assert res.status_code == 200
    assert res.json()["meta"]["total"] == 1


def test_cannot_create_expense_for_someone_elses_vehicle(client, db_session):
    _, vehicle = _customer_and_vehicle(client, "+919820000002")
    intruder = signup_customer(client, "+919820000003")

    res = client.post(
        f"/api/v1/vehicles/{vehicle['id']}/expenses",
        json={"category": "FUEL", "amount": 100.0, "expense_date": "2026-01-05"},
        headers=auth_header(intruder["access_token"]),
    )
    assert res.status_code == 403


def test_update_and_delete_expense(client, db_session):
    token, vehicle = _customer_and_vehicle(client, "+919820000004")
    expense = client.post(
        f"/api/v1/vehicles/{vehicle['id']}/expenses",
        json={"category": "FINE", "amount": 200.0, "expense_date": "2026-01-05"},
        headers=auth_header(token),
    ).json()

    res = client.put(f"/api/v1/expenses/{expense['id']}", json={"amount": 250.0}, headers=auth_header(token))
    assert res.status_code == 200
    assert res.json()["amount"] == 250.0

    res = client.delete(f"/api/v1/expenses/{expense['id']}", headers=auth_header(token))
    assert res.status_code == 204

    res = client.get(f"/api/v1/vehicles/{vehicle['id']}/expenses", headers=auth_header(token))
    assert res.json()["meta"]["total"] == 0


def test_expense_summary_aggregates_by_category(client, db_session):
    token, vehicle = _customer_and_vehicle(client, "+919820000005")
    for amount, category in [(500.0, "FUEL"), (300.0, "FUEL"), (1200.0, "SERVICE")]:
        client.post(
            f"/api/v1/vehicles/{vehicle['id']}/expenses",
            json={"category": category, "amount": amount, "expense_date": "2026-01-05"},
            headers=auth_header(token),
        )

    res = client.get(f"/api/v1/vehicles/{vehicle['id']}/expenses/summary", headers=auth_header(token))
    assert res.status_code == 200
    summary = res.json()
    assert summary["total"] == 2000.0
    assert summary["by_category"]["FUEL"] == 800.0
    assert summary["by_category"]["SERVICE"] == 1200.0


def test_expense_filter_by_category(client, db_session):
    token, vehicle = _customer_and_vehicle(client, "+919820000006")
    client.post(
        f"/api/v1/vehicles/{vehicle['id']}/expenses",
        json={"category": "FUEL", "amount": 500.0, "expense_date": "2026-01-05"},
        headers=auth_header(token),
    )
    client.post(
        f"/api/v1/vehicles/{vehicle['id']}/expenses",
        json={"category": "PARKING", "amount": 50.0, "expense_date": "2026-01-05"},
        headers=auth_header(token),
    )

    res = client.get(f"/api/v1/vehicles/{vehicle['id']}/expenses", params={"category": "FUEL"}, headers=auth_header(token))
    body = res.json()
    assert body["meta"]["total"] == 1
    assert body["items"][0]["category"] == "FUEL"
