"""Pure, DB-free shaping for the per-vehicle Timeline and True Vehicle Cost views.

Everything here is derived from rows that already exist (bookings, expenses, service
records) — no estimates. Cost per kilometre only appears once two odometer readings far
enough apart exist to measure real distance driven.
"""

from datetime import date, datetime, time

from app.core.timezone import IST
from app.models.booking import BookingStatus
from app.models.expense import ExpenseCategory

_BOOKING_EVENT_TIME = {
    BookingStatus.COMPLETED: "completed_at",
    BookingStatus.CANCELLED: "cancelled_at",
    BookingStatus.REJECTED: "rejected_at",
}

CATEGORY_LABELS = {
    ExpenseCategory.FUEL: "Fuel",
    ExpenseCategory.SERVICE: "Service",
    ExpenseCategory.INSURANCE: "Insurance",
    ExpenseCategory.PUC: "PUC",
    ExpenseCategory.PARKING: "Parking",
    ExpenseCategory.FINE: "Fine",
    ExpenseCategory.ACCESSORIES: "Accessories",
    ExpenseCategory.OTHER: "Other",
}


def build_timeline(
    bookings, expenses, packages_by_id: dict, providers_by_id: dict, limit: int, records=()
) -> list[dict]:
    """Newest-first merge of a vehicle's bookings, logged expenses and manual service
    records. Callers pass only expenses not already owned by a record, and only manual
    records (a booking's record is the booking itself), so nothing appears twice."""
    events: list[dict] = []

    for booking in bookings:
        time_field = _BOOKING_EVENT_TIME.get(booking.status)
        occurred_at = (getattr(booking, time_field) if time_field else None) or booking.scheduled_at
        package = packages_by_id.get(booking.package_id)
        provider = providers_by_id.get(booking.provider_id)
        events.append(
            {
                "kind": "BOOKING",
                "occurred_at": occurred_at,
                "title": package.name if package else "Service booking",
                "subtitle": provider.business_name if provider else None,
                "amount": booking.price_at_booking if booking.status == BookingStatus.COMPLETED else None,
                "status": booking.status,
                "category": package.category if package else None,
                "ref_id": booking.id,
            }
        )

    for expense in expenses:
        events.append(
            {
                "kind": "EXPENSE",
                "occurred_at": datetime.combine(expense.expense_date, time.min, tzinfo=IST),
                "title": CATEGORY_LABELS.get(expense.category, expense.category.title()),
                "subtitle": expense.note,
                "amount": expense.amount,
                "status": None,
                "category": expense.category,
                "ref_id": expense.id,
            }
        )

    for record in records:
        events.append(
            {
                "kind": "SERVICE_RECORD",
                "occurred_at": datetime.combine(record.service_date, time.min, tzinfo=IST),
                "title": record.title,
                "subtitle": ", ".join(
                    part
                    for part in (record.provider_name, f"{record.odometer_km:,} km" if record.odometer_km else None)
                    if part
                )
                or None,
                "amount": record.amount,
                "status": None,
                "category": record.service_type,
                "ref_id": record.id,
            }
        )

    events.sort(key=lambda e: e["occurred_at"], reverse=True)
    return events[:limit]


def _month_key(d: date) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def months_back(today: date, months: int) -> list[str]:
    """`months` consecutive "YYYY-MM" keys ending at today's month, oldest first."""
    keys = []
    year, month = today.year, today.month
    for _ in range(months):
        keys.append(f"{year:04d}-{month:02d}")
        month -= 1
        if month == 0:
            month, year = 12, year - 1
    return list(reversed(keys))


def window_start(today: date, months: int) -> date:
    first = months_back(today, months)[0]
    return date(int(first[:4]), int(first[5:]), 1)


MIN_KM_FOR_COST_PER_KM = 100


def cost_per_km_window(readings: list[tuple]) -> dict | None:
    """The measurable stretch between the first and latest odometer readings, or None if
    there aren't two readings on different dates at least 100 km apart. `readings` are
    (record_id, date, km) oldest first."""
    if len(readings) < 2:
        return None
    _, from_date, from_km = readings[0]
    _, to_date, to_km = readings[-1]
    if to_date <= from_date or to_km - from_km < MIN_KM_FOR_COST_PER_KM:
        return None
    return {"from_date": from_date, "to_date": to_date, "from_km": from_km, "to_km": to_km}


def finish_cost_per_km(window: dict, expense_total: float) -> tuple[float, dict]:
    km = window["to_km"] - window["from_km"]
    return round(expense_total / km, 2), {**window, "expense_total": round(expense_total, 2)}


def build_cost_summary(
    month_category_sums: dict[tuple[str, str], float],
    all_time_total: float,
    completed_booking_spend: float,
    completed_booking_count: int,
    today: date,
    months: int,
) -> dict:
    by_category = dict.fromkeys(ExpenseCategory.ALL, 0.0)
    by_month = []
    for key in months_back(today, months):
        month_by_category = dict.fromkeys(ExpenseCategory.ALL, 0.0)
        for (month, category), total in month_category_sums.items():
            if month == key:
                month_by_category[category] = round(total, 2)
                by_category[category] = round(by_category[category] + total, 2)
        by_month.append({"month": key, "total": round(sum(month_by_category.values()), 2), "by_category": month_by_category})

    period_total = round(sum(by_category.values()), 2)
    return {
        "period_months": months,
        "period_total": period_total,
        "all_time_total": round(all_time_total, 2),
        "by_category": by_category,
        "by_month": by_month,
        "average_per_month": round(period_total / months, 2),
        "completed_booking_spend": round(completed_booking_spend, 2),
        "completed_booking_count": completed_booking_count,
    }
