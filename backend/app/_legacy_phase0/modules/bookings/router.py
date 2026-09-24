from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.modules.bookings.models import Booking
from app.modules.bookings.schemas import BookingCreate, BookingOut, BookingStatusUpdate
from app.modules.payments.models import Payment
from app.modules.providers.models import Provider
from app.modules.services.models import Service
from app.modules.users.models import User

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


def _attach_payment(db: Session, booking: Booking) -> Booking:
    booking.payment = db.query(Payment).filter(Payment.booking_id == booking.id).first()
    return booking


@router.get("", response_model=list[BookingOut])
def list_bookings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Booking)
    if current_user.role != "admin":
        query = query.filter(Booking.user_id == current_user.id)
    bookings = query.order_by(Booking.created_at.desc()).all()
    return [_attach_payment(db, b) for b in bookings]


@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: BookingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    provider = db.query(Provider).filter(Provider.id == payload.provider_id).first()
    if provider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    service = (
        db.query(Service)
        .filter(Service.id == payload.service_id, Service.provider_id == payload.provider_id)
        .first()
    )
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found for this provider")

    booking = Booking(
        user_id=current_user.id,
        provider_id=payload.provider_id,
        service_id=payload.service_id,
        address=payload.address,
        scheduled_at=payload.scheduled_at,
        notes=payload.notes,
        price=service.price,
        status="pending",
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return _attach_payment(db, booking)


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if current_user.role != "admin" and booking.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your booking")
    return _attach_payment(db, booking)


@router.patch("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(booking_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if current_user.role != "admin" and booking.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your booking")
    if booking.status not in ("pending", "confirmed"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking can no longer be cancelled")

    booking.status = "cancelled"
    db.commit()
    db.refresh(booking)
    return _attach_payment(db, booking)


@router.patch("/{booking_id}/status", response_model=BookingOut)
def update_booking_status(
    booking_id: int, payload: BookingStatusUpdate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    booking.status = payload.status
    db.commit()
    db.refresh(booking)
    return _attach_payment(db, booking)
