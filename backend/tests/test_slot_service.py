from datetime import date, datetime, time

from app.services.slot_service import compute_available_slots

DAY = date(2026, 9, 28)  # a Monday
NOW = datetime(2026, 9, 27, 0, 0)  # the day before, so nothing on DAY is "in the past"


def test_generates_back_to_back_slots_across_the_whole_window():
    slots = compute_available_slots(DAY, time(9, 0), time(11, 0), 60, [], NOW)
    assert slots == [datetime(2026, 9, 28, 9, 0), datetime(2026, 9, 28, 10, 0)]


def test_does_not_generate_a_slot_that_would_run_past_closing():
    # 90-minute slots in a 2-hour window: only one full slot fits.
    slots = compute_available_slots(DAY, time(9, 0), time(11, 0), 90, [], NOW)
    assert slots == [datetime(2026, 9, 28, 9, 0)]


def test_zero_or_negative_duration_yields_no_slots():
    assert compute_available_slots(DAY, time(9, 0), time(11, 0), 0, [], NOW) == []
    assert compute_available_slots(DAY, time(9, 0), time(11, 0), -30, [], NOW) == []


def test_closes_before_opens_yields_no_slots():
    assert compute_available_slots(DAY, time(11, 0), time(9, 0), 60, [], NOW) == []


def test_excludes_a_slot_that_overlaps_an_existing_booking():
    existing = [(datetime(2026, 9, 28, 10, 0), datetime(2026, 9, 28, 11, 0))]
    slots = compute_available_slots(DAY, time(9, 0), time(12, 0), 60, existing, NOW)
    assert slots == [datetime(2026, 9, 28, 9, 0), datetime(2026, 9, 28, 11, 0)]


def test_back_to_back_bookings_do_not_count_as_overlapping():
    # A booking ending exactly when a candidate slot starts should not block it.
    existing = [(datetime(2026, 9, 28, 9, 0), datetime(2026, 9, 28, 10, 0))]
    slots = compute_available_slots(DAY, time(9, 0), time(11, 0), 60, existing, NOW)
    assert slots == [datetime(2026, 9, 28, 10, 0)]


def test_partial_overlap_still_excludes_the_slot():
    # Existing booking 09:30-10:30 partially overlaps the 09:00-10:00 and 10:00-11:00 candidates.
    existing = [(datetime(2026, 9, 28, 9, 30), datetime(2026, 9, 28, 10, 30))]
    slots = compute_available_slots(DAY, time(9, 0), time(11, 0), 60, existing, NOW)
    assert slots == []


def test_excludes_slots_at_or_before_now():
    now = datetime(2026, 9, 28, 9, 30)
    slots = compute_available_slots(DAY, time(9, 0), time(11, 0), 60, [], now)
    assert slots == [datetime(2026, 9, 28, 10, 0)]


def test_multiple_existing_bookings_each_exclude_their_own_slot():
    existing = [
        (datetime(2026, 9, 28, 9, 0), datetime(2026, 9, 28, 10, 0)),
        (datetime(2026, 9, 28, 11, 0), datetime(2026, 9, 28, 12, 0)),
    ]
    slots = compute_available_slots(DAY, time(9, 0), time(13, 0), 60, existing, NOW)
    assert slots == [datetime(2026, 9, 28, 10, 0), datetime(2026, 9, 28, 12, 0)]


def test_no_availability_window_yields_no_slots():
    assert compute_available_slots(DAY, time(9, 0), time(9, 0), 30, [], NOW) == []
