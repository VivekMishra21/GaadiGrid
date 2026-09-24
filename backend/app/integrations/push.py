import logging
from abc import ABC, abstractmethod

import httpx

from app.core.config import settings

logger = logging.getLogger("gaadigrid.push")


class PushAdapter(ABC):
    """Interface every push provider adapter must implement. Swap the active adapter
    via the PUSH_PROVIDER environment variable — no call-site changes needed. Like
    weather, push delivery is best-effort: a failed send is logged, never raised, so
    it can never break the notification/reminder flow that triggered it."""

    @abstractmethod
    def send(self, token: str, title: str, body: str, data: dict | None = None) -> bool: ...


class DevPushAdapter(PushAdapter):
    """Development-only adapter. Never sends a real push. Logs that a push would have
    been sent — mirrors DevSmsAdapter's transparency about what it isn't doing."""

    def send(self, token: str, title: str, body: str, data: dict | None = None) -> bool:
        logger.info("dev_push_adapter: would push to token %s..., title=%r", token[:12], title)
        return True


class ExpoPushAdapter(PushAdapter):
    """Real adapter against Expo's push API. Needs no account/credentials for basic
    sending (EXPO_ACCESS_TOKEN is optional, only needed for enhanced rate limits), so
    this is genuinely implemented against the real endpoint, not a stub."""

    URL = "https://exp.host/--/api/v2/push/send"

    def send(self, token: str, title: str, body: str, data: dict | None = None) -> bool:
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if settings.expo_access_token:
            headers["Authorization"] = f"Bearer {settings.expo_access_token}"

        payload = {"to": token, "title": title, "body": body, "data": data or {}}
        try:
            response = httpx.post(self.URL, json=payload, headers=headers, timeout=5.0)
            response.raise_for_status()
            result = response.json()
        except httpx.HTTPError:
            logger.warning("expo_push_adapter: push request failed", exc_info=True)
            return False

        ticket = (result.get("data") or {}) if isinstance(result, dict) else {}
        if ticket.get("status") != "ok":
            logger.warning("expo_push_adapter: push ticket rejected: %s", ticket)
            return False
        return True


def get_push_adapter() -> PushAdapter:
    if settings.push_provider == "expo":
        return ExpoPushAdapter()
    return DevPushAdapter()
