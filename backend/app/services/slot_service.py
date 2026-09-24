"""Pure, deterministic slot computation for provider booking availability.

Note on time handling: like `FuelStation.opens_at`/`closes_at` in Phase 2, provider
availability hours are stored as plain wall-clock `time` values with no per-provider
timezone field — this app currently assumes a single locale (India) throughout, so
`target_date`/`opens_at`/`closes_at`/`now` are all treated as the same naive local
frame here, not converted to/from UTC. See docs/RISKS_AND_PENDING_INTEGRATIONS.md.
"""

from datetime import date, datetime, time, timedelta


def compute_available_slots(
    target_date: date,
    opens_at: time,
    closes_at: time,
    duration_minutes: int,
    existing_bookings: list[tuple[datetime, datetime]],
    now: datetime,
) -> list[datetime]:
    """Returns candidate slot start datetimes on `target_date`, stepping every
    `duration_minutes` from `opens_at`, excluding any candidate slot that would run
    past `closes_at`, overlaps an existing booking's [start, end) window, or starts
    at or before `now`. `existing_bookings` must already be filtered by the caller to
    only non-terminal bookings (PENDING/CONFIRMED/IN_PROGRESS) for this provider on
    this date — this function only does the time arithmetic."""
    if duration_minutes <= 0:
        return []

    day_start = datetime.combine(target_date, opens_at)
    day_end = datetime.combine(target_date, closes_at)

    step = timedelta(minutes=duration_minutes)
    slots = []
    cursor = day_start
    while cursor + step <= day_end:
        slot_end = cursor + step
        if cursor > now:
            overlaps = any(cursor < b_end and slot_end > b_start for b_start, b_end in existing_bookings)
            if not overlaps:
                slots.append(cursor)
        cursor += step

    return slots
