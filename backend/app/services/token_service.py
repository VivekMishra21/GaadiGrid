from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import TokenType
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.services.exceptions import RefreshTokenInvalidError, RefreshTokenReuseDetectedError


def issue_token_pair(db: Session, user: User) -> tuple[str, str]:
    access = create_access_token(user.id, user.role)
    refresh, jti, family, expires_at = create_refresh_token(user.id)

    db.add(RefreshToken(user_id=user.id, jti=jti, family_id=family, expires_at=expires_at))
    db.commit()

    return access, refresh


def _revoke_family(db: Session, family_id: str) -> None:
    db.query(RefreshToken).filter(
        RefreshToken.family_id == family_id, RefreshToken.revoked_at.is_(None)
    ).update({"revoked_at": datetime.now(timezone.utc)})
    db.commit()


def rotate_refresh_token(db: Session, refresh_token: str) -> tuple[str, str]:
    """Validates and rotates a refresh token. If a token that was already rotated
    (revoked) is presented again, that's a reuse signal — the whole token family is
    revoked and the caller must log in again."""
    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != TokenType.REFRESH:
        raise RefreshTokenInvalidError("Invalid refresh token.")

    jti = payload.get("jti")
    family_id = payload.get("family")
    user_id = int(payload.get("sub"))

    row = db.scalars(select(RefreshToken).where(RefreshToken.jti == jti)).first()
    if row is None:
        raise RefreshTokenInvalidError("Refresh token not recognized.")

    if row.revoked_at is not None:
        _revoke_family(db, family_id)
        raise RefreshTokenReuseDetectedError(
            "This refresh token was already used. All sessions in this chain have been revoked for safety."
        )

    if row.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise RefreshTokenInvalidError("Refresh token has expired. Please log in again.")

    user = db.get(User, user_id)
    if user is None or not user.is_active or user.deleted_at is not None:
        raise RefreshTokenInvalidError("Account is not active.")

    new_access = create_access_token(user.id, user.role)
    new_refresh, new_jti, _, new_expires_at = create_refresh_token(user.id, family_id=family_id)

    row.revoked_at = datetime.now(timezone.utc)
    row.replaced_by_jti = new_jti
    db.add(RefreshToken(user_id=user.id, jti=new_jti, family_id=family_id, expires_at=new_expires_at))
    db.commit()

    return new_access, new_refresh


def revoke_refresh_token(db: Session, refresh_token: str) -> None:
    """Logout: revokes only this device's current refresh token (not the whole family),
    so other logged-in devices are unaffected."""
    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != TokenType.REFRESH:
        return

    jti = payload.get("jti")
    row = db.scalars(select(RefreshToken).where(RefreshToken.jti == jti)).first()
    if row is not None and row.revoked_at is None:
        row.revoked_at = datetime.now(timezone.utc)
        db.commit()
