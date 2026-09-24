from app.models.booking import BookingStatus
from app.services.booking_state_machine import BookingActor, can_transition


def test_provider_can_confirm_a_pending_booking():
    assert can_transition(BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingActor.PROVIDER) is True


def test_customer_cannot_confirm_a_pending_booking():
    assert can_transition(BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingActor.CUSTOMER) is False


def test_provider_can_reject_a_pending_booking():
    assert can_transition(BookingStatus.PENDING, BookingStatus.REJECTED, BookingActor.PROVIDER) is True


def test_customer_cannot_reject_a_pending_booking():
    assert can_transition(BookingStatus.PENDING, BookingStatus.REJECTED, BookingActor.CUSTOMER) is False


def test_either_party_can_cancel_a_pending_booking():
    assert can_transition(BookingStatus.PENDING, BookingStatus.CANCELLED, BookingActor.CUSTOMER) is True
    assert can_transition(BookingStatus.PENDING, BookingStatus.CANCELLED, BookingActor.PROVIDER) is True


def test_either_party_can_cancel_a_confirmed_booking():
    assert can_transition(BookingStatus.CONFIRMED, BookingStatus.CANCELLED, BookingActor.CUSTOMER) is True
    assert can_transition(BookingStatus.CONFIRMED, BookingStatus.CANCELLED, BookingActor.PROVIDER) is True


def test_only_provider_can_start_a_confirmed_booking():
    assert can_transition(BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, BookingActor.PROVIDER) is True
    assert can_transition(BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, BookingActor.CUSTOMER) is False


def test_only_provider_can_complete_an_in_progress_booking():
    assert can_transition(BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED, BookingActor.PROVIDER) is True
    assert can_transition(BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED, BookingActor.CUSTOMER) is False


def test_cannot_cancel_an_in_progress_booking():
    assert can_transition(BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED, BookingActor.CUSTOMER) is False
    assert can_transition(BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED, BookingActor.PROVIDER) is False


def test_terminal_statuses_allow_no_further_transitions():
    for terminal in BookingStatus.TERMINAL:
        for target in BookingStatus.ALL:
            assert can_transition(terminal, target, BookingActor.CUSTOMER) is False
            assert can_transition(terminal, target, BookingActor.PROVIDER) is False


def test_cannot_skip_straight_from_pending_to_in_progress():
    assert can_transition(BookingStatus.PENDING, BookingStatus.IN_PROGRESS, BookingActor.PROVIDER) is False


def test_cannot_skip_straight_from_confirmed_to_completed():
    assert can_transition(BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingActor.PROVIDER) is False


def test_cannot_reconfirm_an_already_confirmed_booking():
    assert can_transition(BookingStatus.CONFIRMED, BookingStatus.CONFIRMED, BookingActor.PROVIDER) is False
