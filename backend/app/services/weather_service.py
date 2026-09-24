from app.integrations.weather import WeatherForecast

RAIN_WARNING_THRESHOLD = 0.5
RAIN_NOTE_THRESHOLD = 0.3


def get_car_wash_warning(forecast: WeatherForecast | None) -> str | None:
    """Pure decision given an already-fetched forecast — no network/DB access, so it's
    trivially unit-testable. A missing forecast (adapter unavailable/failed) yields no
    warning rather than an error: this is advisory information only and must never
    block a booking."""
    if forecast is None:
        return None
    if forecast.precipitation_probability >= RAIN_WARNING_THRESHOLD:
        return (
            f"Rain is likely ({round(forecast.precipitation_probability * 100)}% chance) around this time — "
            "a wash may not last long."
        )
    if forecast.precipitation_probability >= RAIN_NOTE_THRESHOLD:
        return f"There's some chance of rain ({round(forecast.precipitation_probability * 100)}%) around this time."
    return None
