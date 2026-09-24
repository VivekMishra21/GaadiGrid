from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.modules.bookings.models import Booking
from app.modules.payments.models import Payment
from app.modules.providers.models import Provider
from app.modules.stations.models import Station
from app.modules.users.models import User

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    today = datetime.now(timezone.utc).date()

    station_count = db.query(func.count(Station.id)).scalar() or 0
    provider_count = db.query(func.count(Provider.id)).filter(Provider.is_active.is_(True)).scalar() or 0

    bookings_today = (
        db.query(func.count(Booking.id))
        .filter(func.date(Booking.created_at) == today.isoformat())
        .scalar()
        or 0
    )

    revenue_mtd = (
        db.query(func.coalesce(func.sum(Payment.amount), 0.0))
        .filter(Payment.status == "paid")
        .filter(func.strftime("%Y-%m", Payment.paid_at) == today.strftime("%Y-%m"))
        .scalar()
        or 0.0
    )

    pending_bookings = db.query(func.count(Booking.id)).filter(Booking.status == "pending").scalar() or 0
    pending_payments = db.query(func.count(Payment.id)).filter(Payment.status == "created").scalar() or 0

    return {
        "stations": station_count,
        "active_providers": provider_count,
        "bookings_today": bookings_today,
        "pending_bookings": pending_bookings,
        "pending_payments": pending_payments,
        "revenue_mtd": round(revenue_mtd, 2),
    }
