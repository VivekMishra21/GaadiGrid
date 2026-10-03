from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.constants import Role
from app.database.session import get_db
from app.middleware.rbac import get_current_user, require_roles
from app.models.address import Address
from app.models.booking import Booking, BookingStatus
from app.models.provider import Provider
from app.models.service_package import ServicePackage
from app.models.user import User
from app.models.vehicle import Vehicle
from app.repositories import (
    booking_repository,
    dispute_repository,
    payment_order_repository,
    provider_repository,
    review_repository,
    service_package_repository,
)
from app.schemas.booking import BookingActionIn, BookingCreateIn, BookingOut, ProviderBookingReportOut
from app.schemas.common import PaginatedResponse, paginate
from app.schemas.dispute import DisputeCreateIn, DisputeOut
from app.schemas.review import ReviewCreateIn, ReviewOut, ReviewResponseIn
from app.services import booking_service, dispute_service, review_service
from app.services.audit_service import record_audit_event
from app.services.booking_state_machine import BookingActor
from app.services.exceptions import ForbiddenError, NotFoundError

router = APIRouter(prefix="/api/v1/bookings", tags=["bookings"])


def _to_out(
    db: Session,
    booking: Booking,
    providers_by_id: dict | None = None,
    packages_by_id: dict | None = None,
    payments_by_booking: dict | None = None,
) -> BookingOut:
    """The three `*_by_*` dicts let a caller building a *page* of these (the booking
    list endpoints) pass in batch-fetched data instead of triggering three fresh
    queries per booking — see `_to_out_batch` below. A single-booking caller leaves
    them None and this fetches everything itself, same as before."""
    provider = providers_by_id.get(booking.provider_id) if providers_by_id is not None else db.get(Provider, booking.provider_id)
    package = packages_by_id.get(booking.package_id) if packages_by_id is not None else db.get(ServicePackage, booking.package_id)
    latest_payment = (
        payments_by_booking.get(booking.id)
        if payments_by_booking is not None
        else payment_order_repository.get_latest_for_booking(db, booking.id)
    )
    return BookingOut(
        id=booking.id,
        customer_id=booking.customer_id,
        provider_id=booking.provider_id,
        provider_name=provider.business_name if provider else "",
        package_id=booking.package_id,
        package_name=package.name if package else "",
        vehicle_id=booking.vehicle_id,
        address_id=booking.address_id,
        scheduled_at=booking.scheduled_at,
        duration_minutes=booking.duration_minutes,
        price_at_booking=booking.price_at_booking,
        status=booking.status,
        payment_status=latest_payment.status if latest_payment else None,
        notes=booking.notes,
        cancellation_reason=booking.cancellation_reason,
        cancelled_by_role=booking.cancelled_by_role,
        created_at=booking.created_at,
        confirmed_at=booking.confirmed_at,
        rejected_at=booking.rejected_at,
        started_at=booking.started_at,
        completed_at=booking.completed_at,
        cancelled_at=booking.cancelled_at,
    )


def _to_out_batch(db: Session, bookings: list[Booking]) -> list[BookingOut]:
    """Batched form of `_to_out` for a whole page of bookings at once — three queries
    total (providers, packages, latest payment orders) instead of up to three per
    booking."""
    provider_ids = {b.provider_id for b in bookings}
    package_ids = {b.package_id for b in bookings}
    booking_ids = [b.id for b in bookings]

    providers_by_id = provider_repository.get_by_ids(db, list(provider_ids))
    packages_by_id = service_package_repository.get_by_ids(db, list(package_ids))
    payments_by_booking = payment_order_repository.get_latest_for_bookings(db, booking_ids)

    return [_to_out(db, b, providers_by_id, packages_by_id, payments_by_booking) for b in bookings]


def _get_bookable_provider_and_package(db: Session, payload: BookingCreateIn) -> tuple[Provider, ServicePackage]:
    package = service_package_repository.get_by_id(db, payload.package_id)
    if package is None:
        raise NotFoundError("Service package not found.")
    provider = provider_repository.get_by_id(db, package.provider_id)
    if provider is None:
        raise NotFoundError("Provider not found.")
    return provider, package


@router.post("", response_model=BookingOut, status_code=201)
def create_booking(payload: BookingCreateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    provider, package = _get_bookable_provider_and_package(db, payload)

    vehicle = db.get(Vehicle, payload.vehicle_id)
    if vehicle is None or vehicle.owner_id != user.id or vehicle.deleted_at is not None:
        raise NotFoundError("Vehicle not found.")

    address = None
    if payload.address_id is not None:
        address = db.get(Address, payload.address_id)
        if address is None or address.user_id != user.id:
            raise NotFoundError("Address not found.")

    booking = booking_service.create_booking(
        db, user, package, provider, vehicle, address, payload.scheduled_at, payload.notes
    )
    record_audit_event(db, action="booking.create", actor_user_id=user.id, target_type="booking", target_id=str(booking.id))
    return _to_out(db, booking)


@router.get("/mine", response_model=PaginatedResponse[BookingOut])
def list_my_bookings(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    vehicle_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    offset = (page - 1) * page_size
    items, total = booking_repository.list_for_customer(db, user.id, offset, page_size, vehicle_id)
    return paginate(_to_out_batch(db, items), total, page, page_size)


@router.get("/provider/mine", response_model=PaginatedResponse[BookingOut])
def list_provider_bookings(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*Role.PROVIDER_ROLES)),
):
    provider = provider_repository.get_by_owner_or_staff(db, user.id)
    if provider is None:
        return paginate([], 0, page, page_size)

    offset = (page - 1) * page_size
    items, total = booking_repository.list_for_provider(db, provider.id, offset, page_size)
    return paginate(_to_out_batch(db, items), total, page, page_size)


@router.get("/provider/mine/report", response_model=ProviderBookingReportOut)
def get_provider_booking_report(
    db: Session = Depends(get_db), user: User = Depends(require_roles(*Role.PROVIDER_ROLES))
):
    provider = provider_repository.get_by_owner_or_staff(db, user.id)
    if provider is None:
        return ProviderBookingReportOut(
            total_bookings=0, by_status={}, cancelled_count=0, rejected_count=0, completed_count=0, cancellation_rate=0.0
        )
    return booking_service.build_provider_report(db, provider.id)


def _get_booking_for_actor(db: Session, booking_id: int, user: User) -> tuple[Booking, str]:
    booking = booking_repository.get_by_id(db, booking_id)
    if booking is None:
        raise NotFoundError("Booking not found.")

    if booking.customer_id == user.id:
        return booking, BookingActor.CUSTOMER

    provider = provider_repository.get_by_id(db, booking.provider_id)
    if provider is not None and provider_repository.is_manager(db, provider, user):
        return booking, BookingActor.PROVIDER

    raise ForbiddenError("You do not have access to this booking.")


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    booking, _ = _get_booking_for_actor(db, booking_id, user)
    return _to_out(db, booking)


def _provider_only_action(db: Session, booking_id: int, user: User) -> Booking:
    booking, actor = _get_booking_for_actor(db, booking_id, user)
    if actor != BookingActor.PROVIDER:
        raise ForbiddenError("Only the provider can perform this action.")
    return booking


@router.post("/{booking_id}/confirm", response_model=BookingOut)
def confirm_booking(booking_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    booking = _provider_only_action(db, booking_id, user)
    booking = booking_service.transition(db, booking, BookingStatus.CONFIRMED, BookingActor.PROVIDER)
    record_audit_event(db, action="booking.confirm", actor_user_id=user.id, target_type="booking", target_id=str(booking.id))
    return _to_out(db, booking)


@router.post("/{booking_id}/reject", response_model=BookingOut)
def reject_booking(
    booking_id: int, payload: BookingActionIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    booking = _provider_only_action(db, booking_id, user)
    booking = booking_service.transition(db, booking, BookingStatus.REJECTED, BookingActor.PROVIDER, payload.reason)
    record_audit_event(db, action="booking.reject", actor_user_id=user.id, target_type="booking", target_id=str(booking.id))
    return _to_out(db, booking)


@router.post("/{booking_id}/start", response_model=BookingOut)
def start_booking(booking_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    booking = _provider_only_action(db, booking_id, user)
    booking = booking_service.transition(db, booking, BookingStatus.IN_PROGRESS, BookingActor.PROVIDER)
    record_audit_event(db, action="booking.start", actor_user_id=user.id, target_type="booking", target_id=str(booking.id))
    return _to_out(db, booking)


@router.post("/{booking_id}/complete", response_model=BookingOut)
def complete_booking(booking_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    booking = _provider_only_action(db, booking_id, user)
    booking = booking_service.transition(db, booking, BookingStatus.COMPLETED, BookingActor.PROVIDER)
    record_audit_event(db, action="booking.complete", actor_user_id=user.id, target_type="booking", target_id=str(booking.id))
    return _to_out(db, booking)


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(
    booking_id: int, payload: BookingActionIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    booking, actor = _get_booking_for_actor(db, booking_id, user)
    booking = booking_service.transition(db, booking, BookingStatus.CANCELLED, actor, payload.reason)
    record_audit_event(db, action="booking.cancel", actor_user_id=user.id, target_type="booking", target_id=str(booking.id))
    return _to_out(db, booking)


@router.post("/{booking_id}/review", response_model=ReviewOut, status_code=201)
def submit_review(
    booking_id: int, payload: ReviewCreateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    booking, actor = _get_booking_for_actor(db, booking_id, user)
    if actor != BookingActor.CUSTOMER:
        raise ForbiddenError("Only the customer can review this booking.")
    review = review_service.submit_review(db, booking, payload.rating, payload.comment)
    record_audit_event(db, action="review.create", actor_user_id=user.id, target_type="review", target_id=str(review.id))
    return review


@router.get("/{booking_id}/review", response_model=ReviewOut | None)
def get_review(booking_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _get_booking_for_actor(db, booking_id, user)
    return review_repository.get_by_booking(db, booking_id)


@router.post("/{booking_id}/review/response", response_model=ReviewOut)
def respond_to_review(
    booking_id: int, payload: ReviewResponseIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    booking, actor = _get_booking_for_actor(db, booking_id, user)
    if actor != BookingActor.PROVIDER:
        raise ForbiddenError("Only the provider can respond to this review.")
    review = review_repository.get_by_booking(db, booking_id)
    if review is None:
        raise NotFoundError("No review exists for this booking yet.")
    return review_service.submit_response(db, review, payload.response)


@router.post("/{booking_id}/dispute", response_model=DisputeOut, status_code=201)
def raise_dispute(
    booking_id: int, payload: DisputeCreateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    booking, _ = _get_booking_for_actor(db, booking_id, user)
    dispute = dispute_service.raise_dispute(db, booking, user.id, payload.reason)
    record_audit_event(db, action="dispute.create", actor_user_id=user.id, target_type="dispute", target_id=str(dispute.id))
    return dispute


@router.get("/{booking_id}/disputes", response_model=list[DisputeOut])
def list_disputes(booking_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _get_booking_for_actor(db, booking_id, user)
    return dispute_repository.list_for_booking(db, booking_id)
