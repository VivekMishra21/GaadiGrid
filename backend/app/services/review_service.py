from sqlalchemy.orm import Session

from app.models.booking import Booking, BookingStatus
from app.models.review import Review
from app.repositories import review_repository
from app.services.exceptions import ConflictError, ValidationError


def submit_review(db: Session, booking: Booking, rating: int, comment: str | None) -> Review:
    if booking.status != BookingStatus.COMPLETED:
        raise ValidationError("You can only review a completed booking.")
    if review_repository.get_by_booking(db, booking.id) is not None:
        raise ConflictError("This booking has already been reviewed.")

    return review_repository.create(
        db,
        {
            "booking_id": booking.id,
            "customer_id": booking.customer_id,
            "provider_id": booking.provider_id,
            "rating": rating,
            "comment": comment,
        },
    )


def submit_response(db: Session, review: Review, response: str) -> Review:
    if review.provider_response is not None:
        raise ConflictError("This review already has a response.")
    return review_repository.add_response(db, review, response)
