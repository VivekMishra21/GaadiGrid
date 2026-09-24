from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.constants import ConsentType, OtpPurpose
from app.core.config import settings
from app.core.security import DUMMY_PASSWORD_HASH, verify_password
from app.database.session import get_db
from app.middleware.rate_limit import rate_limit
from app.middleware.rbac import get_current_user
from app.repositories import user_repository
from app.schemas.auth import (
    AccessTokenOut,
    DeleteAccountIn,
    LogoutIn,
    OtpRequestIn,
    OtpRequestOut,
    OtpVerifyIn,
    RefreshIn,
    StaffLoginIn,
    TokenPairOut,
    UserOut,
)
from app.services import otp_service, token_service
from app.services.audit_service import record_audit_event
from app.services.exceptions import RefreshTokenInvalidError, ServiceError, ValidationError
from app.models.user import User
from app.models.user_consent import UserConsent

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

REFRESH_COOKIE_NAME = "gaadigrid_refresh_token"


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """A browser client (admin-web/provider-web) never sees this value in JS — it's
    httpOnly, so an XSS on those portals can't steal a 30-day-valid credential for an
    admin/provider-owner account the way reading it out of localStorage would allow.
    Scoped to /api/v1/auth so it's never sent on ordinary API calls. `secure` is only
    forced in production, since local dev runs over plain http://localhost."""
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path="/api/v1/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path="/api/v1/auth")


@router.post("/otp/request", response_model=OtpRequestOut, dependencies=[Depends(rate_limit("otp_request", 10, 60))])
def request_otp(payload: OtpRequestIn, db: Session = Depends(get_db)):
    dev_otp = otp_service.request_otp(db, payload.phone, OtpPurpose.LOGIN)
    return OtpRequestOut(
        phone=payload.phone,
        expires_in_seconds=settings.otp_expire_seconds,
        resend_cooldown_seconds=settings.otp_resend_cooldown_seconds,
        dev_otp=dev_otp,
    )


@router.post("/otp/verify", response_model=TokenPairOut, dependencies=[Depends(rate_limit("otp_verify", 20, 60))])
def verify_otp(payload: OtpVerifyIn, request: Request, response: Response, db: Session = Depends(get_db)):
    user = user_repository.get_by_phone(db, payload.phone)
    is_new_user = user is None

    # Check signup requirements BEFORE consuming the OTP, so a missing full_name/consent
    # doesn't burn the user's OTP attempt on a request they can't possibly complete yet.
    if is_new_user:
        if not payload.full_name or not payload.full_name.strip():
            raise ValidationError("full_name is required to create a new account.")

        consent_types_given = {c.consent_type for c in payload.consents}
        if not set(ConsentType.ALL).issubset(consent_types_given):
            raise ValidationError("You must accept the Terms of Service and Privacy Policy to continue.")

    otp_service.verify_otp(db, payload.phone, OtpPurpose.LOGIN, payload.otp)

    if is_new_user:
        user = user_repository.create_customer(db, payload.phone, payload.full_name.strip())

        now = datetime.now(timezone.utc)
        for consent in payload.consents:
            db.add(UserConsent(user_id=user.id, consent_type=consent.consent_type, version=consent.version, accepted_at=now))
        db.commit()

    if user.phone_verified_at is None:
        user.phone_verified_at = datetime.now(timezone.utc)
        db.commit()

    access, refresh = token_service.issue_token_pair(db, user)
    _set_refresh_cookie(response, refresh)

    record_audit_event(
        db,
        action="auth.signup" if is_new_user else "auth.login",
        actor_user_id=user.id,
        target_type="user",
        target_id=str(user.id),
        ip_address=_client_ip(request),
    )

    return TokenPairOut(access_token=access, refresh_token=refresh, user=UserOut.model_validate(user))


@router.post("/staff-login", response_model=TokenPairOut, dependencies=[Depends(rate_limit("staff_login", 10, 60))])
def staff_login(payload: StaffLoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    user = user_repository.get_by_email(db, payload.email)
    # Always run a bcrypt verify, even when no such user exists, against a fixed dummy
    # hash — otherwise the "unknown email" path returns near-instantly while a real
    # "wrong password" attempt takes ~50-100ms, letting an attacker enumerate valid
    # staff/admin emails purely from response timing.
    password_ok = verify_password(payload.password, user.password_hash if user and user.password_hash else DUMMY_PASSWORD_HASH)
    if user is None or user.password_hash is None or not password_ok:
        raise ServiceError("Incorrect email or password.", code="invalid_credentials", status_code=401)
    if not user.is_active:
        raise ServiceError("This account is deactivated.", code="account_deactivated", status_code=403)

    access, refresh = token_service.issue_token_pair(db, user)
    _set_refresh_cookie(response, refresh)
    record_audit_event(db, action="auth.staff_login", actor_user_id=user.id, target_type="user", target_id=str(user.id), ip_address=_client_ip(request))
    return TokenPairOut(access_token=access, refresh_token=refresh, user=UserOut.model_validate(user))


@router.post("/refresh", response_model=AccessTokenOut, dependencies=[Depends(rate_limit("refresh", 30, 60))])
def refresh_token(payload: RefreshIn, request: Request, response: Response, db: Session = Depends(get_db)):
    token = payload.refresh_token or request.cookies.get(REFRESH_COOKIE_NAME)
    if not token:
        raise RefreshTokenInvalidError("No refresh token provided.")

    access, refresh = token_service.rotate_refresh_token(db, token)
    _set_refresh_cookie(response, refresh)
    return AccessTokenOut(access_token=access, refresh_token=refresh)


@router.post("/logout", status_code=204)
def logout(
    payload: LogoutIn,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    token = payload.refresh_token or request.cookies.get(REFRESH_COOKIE_NAME)
    _clear_refresh_cookie(response)
    record_audit_event(db, action="auth.logout", actor_user_id=user.id, target_type="user", target_id=str(user.id))
    if token:
        token_service.revoke_refresh_token(db, token)


@router.post("/delete-account", status_code=204)
def delete_account(payload: DeleteAccountIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    user.delete_requested_at = datetime.now(timezone.utc)
    db.commit()
    record_audit_event(
        db,
        action="auth.delete_account_requested",
        actor_user_id=user.id,
        target_type="user",
        target_id=str(user.id),
        context={"reason": payload.reason} if payload.reason else None,
    )


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
