from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.middleware.rbac import get_current_user
from app.models.user import User
from app.repositories import (
    booking_repository,
    expense_repository,
    provider_repository,
    service_package_repository,
    service_record_repository,
    vehicle_repository,
)
from app.schemas.passport import (
    PassportIdentityOut,
    PassportOdometerOut,
    PassportTotalsOut,
    VehiclePassportOut,
)
from app.schemas.reminder import ReminderOut
from app.schemas.service_record import ServiceRecordOut
from app.schemas.vehicle import VehicleCreateIn, VehicleOut, VehicleUpdateIn
from app.schemas.vehicle_insight import TimelineEventOut, VehicleCostOut
from app.services import reminder_service, vehicle_insight_service
from app.services.audit_service import record_audit_event
from app.services.exceptions import ConflictError, ForbiddenError, NotFoundError

router = APIRouter(prefix="/api/v1/vehicles", tags=["vehicles"])


def _get_owned_vehicle(db: Session, vehicle_id: int, user: User):
    vehicle = vehicle_repository.get_by_id(db, vehicle_id)
    if vehicle is None:
        raise NotFoundError("Vehicle not found.")
    if vehicle.owner_id != user.id:
        raise ForbiddenError("You do not have access to this vehicle.")
    return vehicle


@router.get("", response_model=list[VehicleOut])
def list_my_vehicles(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return vehicle_repository.list_by_owner(db, user.id)


@router.post("", response_model=VehicleOut, status_code=201)
def create_vehicle(payload: VehicleCreateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        vehicle = vehicle_repository.create(db, user.id, payload.model_dump())
    except IntegrityError:
        db.rollback()
        raise ConflictError("You already have a vehicle with this registration number.")
    record_audit_event(db, action="vehicle.create", actor_user_id=user.id, target_type="vehicle", target_id=str(vehicle.id))
    return vehicle


@router.get("/reminders", response_model=list[ReminderOut])
def list_reminders(
    vehicle_id: int | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    vehicles = vehicle_repository.list_by_owner(db, user.id)
    if vehicle_id is not None:
        vehicles = [v for v in vehicles if v.id == vehicle_id]
    return reminder_service.compute_reminders(vehicles, date.today())


@router.get("/{vehicle_id}", response_model=VehicleOut)
def get_vehicle(vehicle_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _get_owned_vehicle(db, vehicle_id, user)


@router.put("/{vehicle_id}", response_model=VehicleOut)
def update_vehicle(
    vehicle_id: int, payload: VehicleUpdateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    vehicle = _get_owned_vehicle(db, vehicle_id, user)
    updated = vehicle_repository.update(db, vehicle, payload.model_dump(exclude_unset=True))
    record_audit_event(db, action="vehicle.update", actor_user_id=user.id, target_type="vehicle", target_id=str(vehicle.id))
    return updated


@router.delete("/{vehicle_id}", status_code=204)
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    vehicle = _get_owned_vehicle(db, vehicle_id, user)
    vehicle_repository.soft_delete(db, vehicle)
    record_audit_event(db, action="vehicle.delete", actor_user_id=user.id, target_type="vehicle", target_id=str(vehicle_id))


@router.get("/{vehicle_id}/timeline", response_model=list[TimelineEventOut])
def get_vehicle_timeline(
    vehicle_id: int,
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Newest-first history of everything recorded against this vehicle: its bookings,
    manually logged service records, and expenses not already covered by a record.
    Reminders are intentionally not events (they're derived from dates, not things that
    happened) — see GET /vehicles/reminders."""
    _get_owned_vehicle(db, vehicle_id, user)
    bookings = booking_repository.list_for_vehicle(db, vehicle_id, limit)
    expenses = expense_repository.list_recent_unlinked_for_vehicle(db, vehicle_id, limit)
    records = service_record_repository.recent_for_vehicle(db, vehicle_id, limit, manual_only=True)
    packages_by_id = service_package_repository.get_by_ids(db, list({b.package_id for b in bookings}))
    providers_by_id = provider_repository.get_by_ids(db, list({b.provider_id for b in bookings}))
    return vehicle_insight_service.build_timeline(bookings, expenses, packages_by_id, providers_by_id, limit, records)


@router.get("/{vehicle_id}/cost", response_model=VehicleCostOut)
def get_vehicle_cost(
    vehicle_id: int,
    months: int = Query(default=6, ge=1, le=24),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """True Vehicle Cost from stored expenses only. Cost per kilometre appears only when
    two odometer readings at least 100 km apart exist; it is that stretch's expenses
    divided by the distance, never an estimate."""
    _get_owned_vehicle(db, vehicle_id, user)
    today = date.today()
    month_category_sums = expense_repository.sum_by_month_and_category_for_vehicle(
        db, vehicle_id, vehicle_insight_service.window_start(today, months)
    )
    all_time_total = sum(expense_repository.sum_by_category_for_vehicle(db, vehicle_id).values())
    booking_spend, booking_count = booking_repository.completed_spend_for_vehicle(db, vehicle_id)
    summary = vehicle_insight_service.build_cost_summary(
        month_category_sums, all_time_total, booking_spend, booking_count, today, months
    )

    window = vehicle_insight_service.cost_per_km_window(service_record_repository.odometer_readings(db, vehicle_id))
    if window is not None:
        span_total = expense_repository.sum_between(db, vehicle_id, window["from_date"], window["to_date"])
        summary["cost_per_km"], summary["cost_per_km_basis"] = vehicle_insight_service.finish_cost_per_km(window, span_total)
    return summary


@router.get("/{vehicle_id}/passport", response_model=VehiclePassportOut)
def get_vehicle_passport(vehicle_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """The vehicle's history as GaadiGrid knows it: identity, latest odometer, service
    history, totals and open reminders — all read from stored records."""
    vehicle = _get_owned_vehicle(db, vehicle_id, user)
    records, record_count = service_record_repository.list_for_vehicle(db, vehicle_id, 0, 10)
    odometer = service_record_repository.latest_odometer(db, vehicle_id)
    _, completed_count = booking_repository.completed_count_for_vehicle(db, vehicle_id)
    return VehiclePassportOut(
        identity=PassportIdentityOut(
            vehicle_id=vehicle.id,
            registration_number=vehicle.registration_number,
            vehicle_type=vehicle.vehicle_type,
            brand=vehicle.brand,
            model=vehicle.model,
            variant=vehicle.variant,
            fuel_type=vehicle.fuel_type,
            average_mileage=vehicle.average_mileage,
            on_gaadigrid_since=vehicle.created_at,
        ),
        latest_odometer=PassportOdometerOut(km=odometer[0], as_of=odometer[1]) if odometer else None,
        totals=PassportTotalsOut(
            service_records=record_count,
            completed_bookings=completed_count,
            expenses_logged=expense_repository.count_for_vehicle(db, vehicle_id),
            total_logged_spend=round(sum(expense_repository.sum_by_category_for_vehicle(db, vehicle_id).values()), 2),
        ),
        service_history=[ServiceRecordOut.model_validate(r) for r in records],
        reminders=reminder_service.compute_reminders([vehicle], date.today()),
        disclaimer=(
            "Built from the bookings, expenses and service records logged in GaadiGrid. "
            "It is not a registration certificate or proof of ownership."
        ),
    )
