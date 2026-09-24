"""Pure verification state machine, deliberately the same shape as
booking_state_machine.py — no DB access, just an explicit transition table an actor
either may or may not trigger."""

from app.models.provider import VerificationStatus


class VerificationActor:
    OWNER = "OWNER"
    ADMIN = "ADMIN"


ALLOWED_TRANSITIONS: dict[str, dict[str, tuple[str, ...]]] = {
    VerificationStatus.UNVERIFIED: {
        VerificationStatus.PENDING: (VerificationActor.OWNER,),
    },
    VerificationStatus.PENDING: {
        VerificationStatus.VERIFIED: (VerificationActor.ADMIN,),
        VerificationStatus.REJECTED: (VerificationActor.ADMIN,),
    },
    VerificationStatus.REJECTED: {
        VerificationStatus.PENDING: (VerificationActor.OWNER,),
    },
}


def can_transition_verification(current_status: str, new_status: str, actor: str) -> bool:
    return actor in ALLOWED_TRANSITIONS.get(current_status, {}).get(new_status, ())
