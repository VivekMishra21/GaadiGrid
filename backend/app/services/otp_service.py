import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.redis_client import get_redis
from app.core.security import hash_otp, verify_otp_hash
from app.integrations.sms import get_sms_adapter
from app.models.otp_request import OtpRequest
from app.services.exceptions import (
    OtpAttemptsExceededError,
    OtpCooldownError,
    OtpExpiredError,
    OtpIncorrectError,
    OtpNotFoundError,
    OtpRateLimitError,
)


def _cooldown_key(phone: str) -> str:
    return f"otp:cooldown:{phone}"


def _hourly_key(phone: str) -> str:
    return f"otp:hourly_count:{phone}"


def generate_otp_code() -> str:
    return "".join(secrets.choice("0123456789") for _ in range(settings.otp_length))


def request_otp(db: Session, phone: str, purpose: str) -> str | None:
    """Creates and 'sends' an OTP. Returns the plaintext code only outside production,
    so local/dev/test clients can log in without a real SMS provider — never in prod."""
    r = get_redis()

    if r.exists(_cooldown_key(phone)):
        ttl = r.ttl(_cooldown_key(phone))
        raise OtpCooldownError(f"Please wait {ttl}s before requesting another OTP.")

    hourly_count = r.incr(_hourly_key(phone))
    if hourly_count == 1:
        r.expire(_hourly_key(phone), 3600)
    if hourly_count > settings.otp_max_resends_per_hour:
        raise OtpRateLimitError("Too many OTP requests. Please try again later.")

    code = generate_otp_code()
    now = datetime.now(timezone.utc)
    otp_row = OtpRequest(
        phone=phone,
        purpose=purpose,
        otp_hash=hash_otp(code, phone),
        expires_at=now + timedelta(seconds=settings.otp_expire_seconds),
        attempts=0,
        max_attempts=settings.otp_max_attempts,
    )
    db.add(otp_row)
    db.commit()

    get_sms_adapter().send_otp(phone, code)
    r.setex(_cooldown_key(phone), settings.otp_resend_cooldown_seconds, "1")

    return None if settings.is_production else code


def verify_otp(db: Session, phone: str, purpose: str, code: str) -> None:
    """Raises a ServiceError subclass on any failure; returns None on success."""
    otp_row = db.scalars(
        select(OtpRequest)
        .where(OtpRequest.phone == phone, OtpRequest.purpose == purpose, OtpRequest.consumed_at.is_(None))
        .order_by(OtpRequest.created_at.desc())
    ).first()

    if otp_row is None:
        raise OtpNotFoundError("No pending OTP for this phone number. Please request a new one.")

    now = datetime.now(timezone.utc)
    if otp_row.expires_at.replace(tzinfo=timezone.utc) < now:
        raise OtpExpiredError("This OTP has expired. Please request a new one.")

    if otp_row.attempts >= otp_row.max_attempts:
        raise OtpAttemptsExceededError("Too many incorrect attempts. Please request a new OTP.")

    otp_row.attempts += 1

    if not verify_otp_hash(code, phone, otp_row.otp_hash):
        db.commit()
        remaining = otp_row.max_attempts - otp_row.attempts
        if remaining <= 0:
            raise OtpAttemptsExceededError("Too many incorrect attempts. Please request a new OTP.")
        raise OtpIncorrectError(f"Incorrect OTP. {remaining} attempt(s) remaining.")

    otp_row.consumed_at = now
    db.commit()
