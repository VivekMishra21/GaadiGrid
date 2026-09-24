import logging
from abc import ABC, abstractmethod

from app.core.config import settings

logger = logging.getLogger("gaadigrid.sms")


def mask_phone(phone: str) -> str:
    if len(phone) <= 4:
        return "*" * len(phone)
    return phone[:3] + "*" * (len(phone) - 5) + phone[-2:]


class SmsAdapter(ABC):
    """Interface every SMS provider adapter must implement. Swap the active adapter via
    the OTP_PROVIDER environment variable — no call-site changes needed."""

    @abstractmethod
    def send_otp(self, phone: str, otp: str) -> None: ...


class DevSmsAdapter(SmsAdapter):
    """Development-only adapter. Never sends a real SMS. Logs that an OTP was issued —
    the OTP itself is never written to logs, only surfaced via the API response when
    running outside production (see routers/auth.py)."""

    def send_otp(self, phone: str, otp: str) -> None:
        logger.info("dev_sms_adapter: OTP issued for %s (dev mode, not sent via SMS)", mask_phone(phone))


class TwilioSmsAdapter(SmsAdapter):
    """Production adapter stub. Wire up real Twilio credentials in .env and implement
    send_otp before switching OTP_PROVIDER=twilio in any non-development environment."""

    def send_otp(self, phone: str, otp: str) -> None:
        raise NotImplementedError(
            "TwilioSmsAdapter is not implemented yet. Set OTP_PROVIDER=dev for local development, "
            "or implement this adapter with real Twilio credentials before using it."
        )


def get_sms_adapter() -> SmsAdapter:
    if settings.otp_provider == "twilio":
        return TwilioSmsAdapter()
    return DevSmsAdapter()
