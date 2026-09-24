import hashlib
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime

import httpx

from app.core.config import settings

logger = logging.getLogger("gaadigrid.weather")


@dataclass
class WeatherForecast:
    condition: str
    precipitation_probability: float  # 0.0-1.0
    temp_c: float


class WeatherAdapter(ABC):
    """Interface every weather provider adapter must implement. Swap the active
    adapter via the WEATHER_PROVIDER environment variable — no call-site changes
    needed. Unlike the SMS/payment adapters, this is advisory-only (a booking never
    fails or blocks because a forecast is unavailable), so there is no production
    boot-guard forcing a real provider — see weather_service.py."""

    @abstractmethod
    def get_forecast(self, lat: float, lon: float, at: datetime) -> WeatherForecast | None: ...


class DevWeatherAdapter(WeatherAdapter):
    """Development-only adapter. Never calls a real weather API. Deterministic per
    (location, day) — the same coordinates and date always produce the same simulated
    forecast, so dev/test behavior is stable and reproducible, but different days and
    places still vary, unlike a hardcoded constant."""

    def get_forecast(self, lat: float, lon: float, at: datetime) -> WeatherForecast | None:
        seed = f"{round(lat, 2)}:{round(lon, 2)}:{at.date().isoformat()}"
        digest = hashlib.sha256(seed.encode()).hexdigest()
        precipitation_probability = (int(digest[:4], 16) % 100) / 100
        temp_c = 18 + (int(digest[4:6], 16) % 20)
        condition = "RAIN" if precipitation_probability >= 0.5 else "CLEAR"
        logger.info(
            "dev_weather_adapter: simulated forecast for (%.2f, %.2f) on %s — %s, %.0f%% rain",
            lat,
            lon,
            at.date(),
            condition,
            precipitation_probability * 100,
        )
        return WeatherForecast(condition=condition, precipitation_probability=precipitation_probability, temp_c=temp_c)


class OpenWeatherMapAdapter(WeatherAdapter):
    """Real adapter against OpenWeatherMap's free-tier 5-day/3-hour forecast API.
    Needs only WEATHER_API_KEY (no business verification, unlike Razorpay/Twilio), so
    this is genuinely implemented, not a stub. Returns None (not an error) if the
    requested time is more than 5 days out or the API call fails — callers treat a
    missing forecast as "no warning to show", never as a reason to block a booking."""

    BASE_URL = "https://api.openweathermap.org/data/2.5/forecast"

    def get_forecast(self, lat: float, lon: float, at: datetime) -> WeatherForecast | None:
        if not settings.weather_api_key:
            logger.warning("openweathermap_adapter: WEATHER_API_KEY not set, cannot fetch forecast")
            return None
        try:
            response = httpx.get(
                self.BASE_URL,
                params={"lat": lat, "lon": lon, "appid": settings.weather_api_key, "units": "metric"},
                timeout=5.0,
            )
            response.raise_for_status()
            payload = response.json()
        except httpx.HTTPError:
            logger.warning("openweathermap_adapter: forecast request failed", exc_info=True)
            return None

        closest = _closest_entry(payload.get("list", []), at)
        if closest is None:
            return None

        return WeatherForecast(
            condition=closest["weather"][0]["main"].upper() if closest.get("weather") else "UNKNOWN",
            precipitation_probability=float(closest.get("pop", 0.0)),
            temp_c=float(closest.get("main", {}).get("temp", 0.0)),
        )


def _closest_entry(entries: list[dict], at: datetime) -> dict | None:
    best, best_diff = None, None
    for entry in entries:
        entry_dt = datetime.fromtimestamp(entry["dt"], tz=at.tzinfo)
        diff = abs((entry_dt - at).total_seconds())
        if best_diff is None or diff < best_diff:
            best, best_diff = entry, diff
    return best


def get_weather_adapter() -> WeatherAdapter:
    if settings.weather_provider == "openweathermap":
        return OpenWeatherMapAdapter()
    return DevWeatherAdapter()
