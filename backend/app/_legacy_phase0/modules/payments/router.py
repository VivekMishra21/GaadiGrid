from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import RAZORPAY_ENABLED, RAZORPAY_KEY_ID
from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.modules.bookings.models import Booking
from app.modules.payments import gateway
from app.modules.payments.models import Payment
from app.modules.payments.schemas import PaymentOrderOut, PaymentOut, PaymentVerifyIn
from app.modules.users.models import User

router = APIRouter(tags=["payments"])


def _get_owned_booking(db: Session, booking_id: int, current_user: User) -> Booking:
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if current_user.role != "admin" and booking.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your booking")
    return booking


@router.post("/api/bookings/{booking_id}/payment/order", response_model=PaymentOrderOut)
def create_payment_order(
    booking_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    booking = _get_owned_booking(db, booking_id, current_user)

    existing = db.query(Payment).filter(Payment.booking_id == booking_id).first()
    if existing and existing.status == "paid":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking already paid")

    if existing and existing.status == "created":
        payment = existing
    else:
        order_id, mode = gateway.create_order(booking.price, receipt=f"booking-{booking.id}")
        payment = Payment(
            booking_id=booking.id,
            provider="razorpay",
            provider_order_id=order_id,
            amount=booking.price,
            currency="INR",
            status="created",
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)

    return PaymentOrderOut(
        payment=PaymentOut.model_validate(payment),
        mode="razorpay" if RAZORPAY_ENABLED else "test_simulation",
        key_id=RAZORPAY_KEY_ID if RAZORPAY_ENABLED else "",
    )


@router.get("/api/bookings/{booking_id}/payment", response_model=PaymentOut | None)
def get_payment(booking_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_owned_booking(db, booking_id, current_user)
    return db.query(Payment).filter(Payment.booking_id == booking_id).first()


@router.post("/api/payments/verify", response_model=PaymentOut)
def verify_payment(payload: PaymentVerifyIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    booking = _get_owned_booking(db, payload.booking_id, current_user)
    payment = db.query(Payment).filter(Payment.booking_id == booking.id).first()
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No payment order for this booking")
    if payment.provider_order_id != payload.razorpay_order_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order mismatch")

    ok = gateway.verify_signature(payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature)
    if not ok:
        payment.status = "failed"
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment signature verification failed")

    payment.status = "paid"
    payment.provider_payment_id = payload.razorpay_payment_id
    payment.paid_at = datetime.now(timezone.utc)
    if booking.status == "pending":
        booking.status = "confirmed"
    db.commit()
    db.refresh(payment)
    return payment


@router.post("/api/bookings/{booking_id}/payment/simulate-success", response_model=PaymentOut)
def simulate_payment_success(
    booking_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if RAZORPAY_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Test simulation is disabled once live keys are configured"
        )

    booking = _get_owned_booking(db, booking_id, current_user)
    payment = db.query(Payment).filter(Payment.booking_id == booking.id).first()
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No payment order for this booking")
    if payment.status == "paid":
        return payment

    payment.status = "paid"
    payment.provider_payment_id = f"pay_sim_{payment.provider_order_id[len('order_sim_'):]}"
    payment.paid_at = datetime.now(timezone.utc)
    if booking.status == "pending":
        booking.status = "confirmed"
    db.commit()
    db.refresh(payment)
    return payment


@router.post("/api/bookings/{booking_id}/payment/refund", response_model=PaymentOut)
def refund_booking_payment(booking_id: int, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    payment = db.query(Payment).filter(Payment.booking_id == booking_id).first()
    if payment is None or payment.status != "paid":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No paid payment to refund")

    gateway.refund_payment(payment.provider_payment_id, payment.amount)
    payment.status = "refunded"
    db.commit()
    db.refresh(payment)
    return payment
