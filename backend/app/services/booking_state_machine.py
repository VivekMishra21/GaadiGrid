"""Pure booking state machine. No DB access — `can_transition` just answers whether
a given actor may move a booking from one status to another; the service layer
(`booking_service.py`) is responsible for actually applying the transition, stamping
the matching timestamp column, and persisting it."""

from app.models.booking import BookingStatus


class BookingActor:
    CUSTOMER = "CUSTOMER"
    PROVIDER = "PROVIDER"


# {current_status: {new_status: (actors allowed to make this transition,)}}
ALLOWED_TRANSITIONS: dict[str, dict[str, tuple[str, ...]]] = {
    BookingStatus.PENDING: {
        BookingStatus.CONFIRMED: (BookingActor.PROVIDER,),
        BookingStatus.REJECTED: (BookingActor.PROVIDER,),
        BookingStatus.CANCELLED: (BookingActor.CUSTOMER, BookingActor.PROVIDER),
    },
    BookingStatus.CONFIRMED: {
        BookingStatus.IN_PROGRESS: (BookingActor.PROVIDER,),
        BookingStatus.CANCELLED: (BookingActor.CUSTOMER, BookingActor.PROVIDER),
    },
    BookingStatus.IN_PROGRESS: {
        BookingStatus.COMPLETED: (BookingActor.PROVIDER,),
    },
}

# The timestamp column on Booking that gets stamped when entering each status.
TIMESTAMP_FIELD_FOR_STATUS = {
    BookingStatus.CONFIRMED: "confirmed_at",
    BookingStatus.REJECTED: "rejected_at",
    BookingStatus.CANCELLED: "cancelled_at",
    BookingStatus.IN_PROGRESS: "started_at",
    BookingStatus.COMPLETED: "completed_at",
}


def can_transition(current_status: str, new_status: str, actor: str) -> bool:
    return actor in ALLOWED_TRANSITIONS.get(current_status, {}).get(new_status, ())
