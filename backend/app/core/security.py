import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.core.constants import TokenType

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# A fixed, valid bcrypt hash of no real password — verified against on a login attempt
# for an email that doesn't exist, so that path takes the same ~bcrypt-verify amount of
# time as a real "wrong password" attempt. Without this, an unknown-email response
# returns near-instantly while a known-email/wrong-password response takes ~50-100ms,
# letting an attacker enumerate valid staff/admin emails purely by response timing.
DUMMY_PASSWORD_HASH = pwd_context.hash("not-a-real-password-used-only-for-timing-safety")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_otp(otp: str, phone: str) -> str:
    """OTPs are salted with the phone number and hashed the same way passwords are —
    never stored or logged in plaintext."""
    return pwd_context.hash(f"{phone}:{otp}")


def verify_otp_hash(otp: str, phone: str, otp_hash: str) -> bool:
    return pwd_context.verify(f"{phone}:{otp}", otp_hash)


def create_access_token(user_id: int, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": TokenType.ACCESS,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: int, family_id: str | None = None) -> tuple[str, str, str, datetime]:
    """Returns (token, jti, family_id, expires_at). A new family_id is minted unless
    rotating an existing family."""
    now = datetime.now(timezone.utc)
    jti = uuid.uuid4().hex
    family = family_id or uuid.uuid4().hex
    expires_at = now + timedelta(days=settings.refresh_token_expire_days)
    payload = {
        "sub": str(user_id),
        "type": TokenType.REFRESH,
        "jti": jti,
        "family": family,
        "iat": now,
        "exp": expires_at,
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, jti, family, expires_at


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
