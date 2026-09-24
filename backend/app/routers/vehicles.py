from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.middleware.rbac import get_current_user
from app.models.user import User
from app.repositories import vehicle_repository
from app.schemas.reminder import ReminderOut
from app.schemas.vehicle import VehicleCreateIn, VehicleOut, VehicleUpdateIn
from app.services import reminder_service
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
def list_reminders(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    vehicles = vehicle_repository.list_by_owner(db, user.id)
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
