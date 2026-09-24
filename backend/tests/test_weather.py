from datetime import datetime, timedelta, timezone

from app.integrations.weather import DevWeatherAdapter
from tests.helpers import create_provider, create_provider_owner, login_staff


def test_weather_warning_endpoint_returns_a_key_even_when_no_warning_applies(client, db_session):
    create_provider_owner(client, db_session, "weather1@test.dev")
    owner_token = login_staff(client, "weather1@test.dev")["access_token"]
    provider = create_provider(client, owner_token)

    res = client.get(f"/api/v1/providers/{provider['id']}/weather-warning", params={"scheduled_at": "2026-06-15T10:00:00Z"})
    assert res.status_code == 200
    assert "warning" in res.json()


def test_weather_warning_for_provider_with_no_coordinates_is_none(client, db_session):
    create_provider_owner(client, db_session, "weather2@test.dev")
    owner_token = login_staff(client, "weather2@test.dev")["access_token"]
    provider = create_provider(client, owner_token, {"latitude": None, "longitude": None})

    res = client.get(f"/api/v1/providers/{provider['id']}/weather-warning", params={"scheduled_at": "2026-06-15T10:00:00Z"})
    assert res.status_code == 200
    assert res.json()["warning"] is None


def test_weather_warning_for_unknown_provider_404s(client, db_session):
    res = client.get("/api/v1/providers/999999/weather-warning", params={"scheduled_at": "2026-06-15T10:00:00Z"})
    assert res.status_code == 404


def test_dev_weather_adapter_is_deterministic_for_the_same_input():
    adapter = DevWeatherAdapter()
    at = datetime(2026, 6, 15, 10, 0, tzinfo=timezone.utc)
    first = adapter.get_forecast(28.6, 77.2, at)
    second = adapter.get_forecast(28.6, 77.2, at)
    assert first == second


def test_dev_weather_adapter_varies_by_day():
    adapter = DevWeatherAdapter()
    at = datetime(2026, 6, 15, 10, 0, tzinfo=timezone.utc)
    forecasts = {adapter.get_forecast(28.6, 77.2, at + timedelta(days=i)).precipitation_probability for i in range(10)}
    assert len(forecasts) > 1
