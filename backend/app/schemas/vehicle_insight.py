from datetime import date, datetime

from pydantic import BaseModel


class TimelineEventOut(BaseModel):
    kind: str  # "BOOKING" | "EXPENSE" | "SERVICE_RECORD"
    occurred_at: datetime
    title: str
    subtitle: str | None = None
    amount: float | None = None
    status: str | None = None
    category: str | None = None
    ref_id: int


class CostPerKmBasisOut(BaseModel):
    from_km: int
    to_km: int
    from_date: date
    to_date: date
    expense_total: float


class MonthlyCostOut(BaseModel):
    month: str  # "YYYY-MM"
    total: float
    by_category: dict[str, float]


class VehicleCostOut(BaseModel):
    period_months: int
    period_total: float
    all_time_total: float
    by_category: dict[str, float]
    by_month: list[MonthlyCostOut]
    average_per_month: float
    # Only present when two odometer readings far enough apart exist; never estimated.
    cost_per_km: float | None = None
    cost_per_km_basis: CostPerKmBasisOut | None = None
    # Completed bookings that have no linked expense yet; shown beside, never added to, the expense totals.
    completed_booking_spend: float
    completed_booking_count: int
