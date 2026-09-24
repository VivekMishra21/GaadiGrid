from app.integrations.weather import WeatherForecast
from app.services.weather_service import get_car_wash_warning


def test_no_forecast_means_no_warning():
    assert get_car_wash_warning(None) is None


def test_low_rain_probability_means_no_warning():
    forecast = WeatherForecast(condition="CLEAR", precipitation_probability=0.1, temp_c=25.0)
    assert get_car_wash_warning(forecast) is None


def test_moderate_rain_probability_gives_a_soft_note():
    forecast = WeatherForecast(condition="CLOUDS", precipitation_probability=0.35, temp_c=22.0)
    warning = get_car_wash_warning(forecast)
    assert warning is not None
    assert "35%" in warning


def test_high_rain_probability_gives_a_strong_warning():
    forecast = WeatherForecast(condition="RAIN", precipitation_probability=0.8, temp_c=20.0)
    warning = get_car_wash_warning(forecast)
    assert warning is not None
    assert "80%" in warning
    assert "may not last" in warning


def test_boundary_at_exactly_50_percent_is_the_strong_warning():
    forecast = WeatherForecast(condition="RAIN", precipitation_probability=0.5, temp_c=20.0)
    assert "may not last" in get_car_wash_warning(forecast)


def test_boundary_at_exactly_30_percent_is_the_soft_note():
    forecast = WeatherForecast(condition="CLOUDS", precipitation_probability=0.3, temp_c=20.0)
    warning = get_car_wash_warning(forecast)
    assert warning is not None
    assert "may not last" not in warning
