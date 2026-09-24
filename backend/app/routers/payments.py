from fastapi import APIRouter, Depends, Request

from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.session import get_db
from app.middleware.rate_limit import rate_limit
from app.middleware.rbac import get_current_user
from app.models.booking import Booking, BookingStatus
from app.models.provider import Provider
from app.models.user import User
from app.repositories import booking_repository, payment_order_repository, provider_repository, refund_repository
from app.schemas.payment import PaymentOrderOut, RefundOut
from app.services import payment_service
from app.services.audit_service import record_audit_event
from app.services.exceptions import ForbiddenError, NotFoundError, ValidationError

router = APIRouter(prefix="/api/v1/bookings/{booking_id}", tags=["payments"])
webhook_router = APIRouter(prefix="/api/v1/payments", tags=["payments"])


def _get_booking_for_viewer(db: Session, booking_id: int, user: User) -> Booking:
    booking = booking_repository.get_by_id(db, booking_id)
    if booking is None:
        raise NotFoundError("Booking not found.")
    if booking.customer_id == user.id:
        return booking
    provider: Provider | None = provider_repository.get_by_id(db, booking.provider_id)
    if provider is not None and provider_repository.is_manager(db, provider, user):
        return booking
    raise ForbiddenError("You do not have access to this booking.")


@router.post("/payment", response_model=PaymentOrderOut, status_code=201)
def create_payment(booking_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    booking = booking_repository.get_by_id(db, booking_id)
    if booking is None or booking.customer_id != user.id:
        raise NotFoundError("Booking not found.")
    if booking.status != BookingStatus.CONFIRMED:
        raise ValidationError("Payment can only be started for a confirmed booking.")

    order = payment_service.create_payment_order(db, booking)
    record_audit_event(db, action="payment.create_order", actor_user_id=user.id, target_type="booking", target_id=str(booking_id))
    return order


@router.get("/payment", response_model=PaymentOrderOut | None)
def get_payment(booking_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    booking = _get_booking_for_viewer(db, booking_id, user)
    return payment_order_repository.get_latest_for_booking(db, booking.id)


@router.get("/refunds", response_model=list[RefundOut])
def list_refunds(booking_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    booking = _get_booking_for_viewer(db, booking_id, user)
    return refund_repository.list_for_booking(db, booking.id)


@webhook_router.post("/{order_id}/dev-complete", response_model=PaymentOrderOut)
def dev_complete_payment(
    order_id: int,
    success: bool = True,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Dev-only simulation of a gateway payment callback — see payment_service for
    why this exercises the real signature-verification path rather than skipping it."""
    if settings.is_production:
        raise ValidationError("Not available in production.")

    order = payment_order_repository.get_by_id(db, order_id)
    if order is None or order.customer_id != user.id:
        raise NotFoundError("Payment order not found.")

    payment_service.simulate_dev_payment_completion(db, order, success)
    record_audit_event(
        db,
        action="payment.dev_complete",
        actor_user_id=user.id,
        target_type="payment_order",
        target_id=str(order_id),
        context={"success": success},
    )
    return payment_order_repository.get_by_id(db, order_id)


@webhook_router.post("/webhook", status_code=200, dependencies=[Depends(rate_limit("payment_webhook", 120, 60))])
async def payment_webhook(request: Request, db: Session = Depends(get_db)):
    raw_body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    return payment_service.process_webhook(db, raw_body, signature)
