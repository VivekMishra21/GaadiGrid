from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.booking import Booking
from app.models.settlement import Settlement, SettlementStatus
from app.repositories import settlement_repository


def calculate_commission(gross_amount: float, commission_rate: float) -> tuple[float, float]:
    """Pure. Returns (commission_amount, net_payable_amount), both rounded to paise."""
    commission_amount = round(gross_amount * commission_rate, 2)
    net_payable_amount = round(gross_amount - commission_amount, 2)
    return commission_amount, net_payable_amount


def create_settlement_for_booking(db: Session, booking: Booking) -> Settlement:
    """Idempotent — a booking can only ever have one settlement (enforced by a unique
    constraint on booking_id too), so re-completing the same booking is a no-op."""
    existing = settlement_repository.get_by_booking(db, booking.id)
    if existing:
        return existing

    commission_rate = settings.default_commission_rate
    gross = booking.price_at_booking
    commission, net = calculate_commission(gross, commission_rate)

    return settlement_repository.create(
        db,
        {
            "provider_id": booking.provider_id,
            "booking_id": booking.id,
            "gross_amount": gross,
            "commission_rate": commission_rate,
            "commission_amount": commission,
            "net_payable_amount": net,
            "status": SettlementStatus.PENDING,
        },
    )
