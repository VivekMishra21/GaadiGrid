from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.provider import Provider, VerificationStatus
from app.repositories import provider_repository
from app.services.exceptions import ConflictError
from app.services.provider_verification import VerificationActor, can_transition_verification


def submit_verification(
    db: Session, provider: Provider, business_registration_number: str, gst_number: str | None
) -> Provider:
    if not can_transition_verification(provider.verification_status, VerificationStatus.PENDING, VerificationActor.OWNER):
        raise ConflictError(f"Cannot submit for verification from {provider.verification_status}.")
    return provider_repository.update(
        db,
        provider,
        {
            "verification_status": VerificationStatus.PENDING,
            "business_registration_number": business_registration_number,
            "gst_number": gst_number,
            "verification_notes": None,
            "verification_submitted_at": datetime.now(timezone.utc),
        },
    )


def approve_verification(db: Session, provider: Provider) -> Provider:
    if not can_transition_verification(provider.verification_status, VerificationStatus.VERIFIED, VerificationActor.ADMIN):
        raise ConflictError(f"Cannot verify from {provider.verification_status}.")
    return provider_repository.update(
        db,
        provider,
        {
            "verification_status": VerificationStatus.VERIFIED,
            "verified_at": datetime.now(timezone.utc),
            "verification_notes": None,
        },
    )


def reject_verification(db: Session, provider: Provider, reason: str) -> Provider:
    if not can_transition_verification(provider.verification_status, VerificationStatus.REJECTED, VerificationActor.ADMIN):
        raise ConflictError(f"Cannot reject from {provider.verification_status}.")
    return provider_repository.update(
        db, provider, {"verification_status": VerificationStatus.REJECTED, "verification_notes": reason}
    )
