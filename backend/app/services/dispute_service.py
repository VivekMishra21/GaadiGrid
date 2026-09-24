from sqlalchemy.orm import Session

from app.models.booking import Booking
from app.models.dispute import Dispute, DisputeStatus
from app.repositories import dispute_repository
from app.services.exceptions import ConflictError, ValidationError

RESOLVABLE_STATUSES = (DisputeStatus.RESOLVED, DisputeStatus.DISMISSED)


def raise_dispute(db: Session, booking: Booking, raised_by_user_id: int, reason: str) -> Dispute:
    if dispute_repository.get_open_for_booking(db, booking.id) is not None:
        raise ConflictError("There is already an open dispute for this booking.")

    return dispute_repository.create(
        db, {"booking_id": booking.id, "raised_by_user_id": raised_by_user_id, "reason": reason}
    )


def resolve_dispute(db: Session, dispute: Dispute, status: str, resolution_note: str, resolved_by_user_id: int) -> Dispute:
    if status not in RESOLVABLE_STATUSES:
        raise ValidationError(f"status must be one of {RESOLVABLE_STATUSES}")
    if dispute.status != DisputeStatus.OPEN:
        raise ConflictError("This dispute has already been closed.")

    return dispute_repository.resolve(db, dispute, status, resolution_note, resolved_by_user_id)
