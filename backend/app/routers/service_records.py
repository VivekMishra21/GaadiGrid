from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.middleware.rbac import get_current_user
from app.models.service_record import ServiceRecord
from app.models.user import User
from app.repositories import service_record_repository, vehicle_repository
from app.schemas.common import PaginatedResponse, paginate
from app.schemas.service_record import ServiceRecordCreateIn, ServiceRecordOut, ServiceRecordUpdateIn
from app.services import service_record_service
from app.services.audit_service import record_audit_event
from app.services.exceptions import ForbiddenError, NotFoundError

router = APIRouter(prefix="/api/v1", tags=["service-records"])


def _get_owned_vehicle(db: Session, vehicle_id: int, user: User):
    vehicle = vehicle_repository.get_by_id(db, vehicle_id)
    if vehicle is None:
        raise NotFoundError("Vehicle not found.")
    if vehicle.owner_id != user.id:
        raise ForbiddenError("You do not have access to this vehicle.")
    return vehicle


def _get_owned_record(db: Session, record_id: int, user: User) -> ServiceRecord:
    record = service_record_repository.get_by_id(db, record_id)
    if record is None:
        raise NotFoundError("Service record not found.")
    if record.owner_id != user.id:
        raise ForbiddenError("You do not have access to this service record.")
    return record


@router.get("/vehicles/{vehicle_id}/service-records", response_model=PaginatedResponse[ServiceRecordOut])
def list_service_records(
    vehicle_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_owned_vehicle(db, vehicle_id, user)
    items, total = service_record_repository.list_for_vehicle(db, vehicle_id, (page - 1) * page_size, page_size)
    return paginate([ServiceRecordOut.model_validate(r) for r in items], total, page, page_size)


@router.post("/vehicles/{vehicle_id}/service-records", response_model=ServiceRecordOut, status_code=201)
def create_service_record(
    vehicle_id: int, payload: ServiceRecordCreateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    _get_owned_vehicle(db, vehicle_id, user)
    record = service_record_service.create_manual_record(db, user.id, vehicle_id, payload.model_dump())
    record_audit_event(db, action="service_record.create", actor_user_id=user.id, target_type="service_record", target_id=str(record.id))
    return record


@router.put("/service-records/{record_id}", response_model=ServiceRecordOut)
def update_service_record(
    record_id: int, payload: ServiceRecordUpdateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    record = _get_owned_record(db, record_id, user)
    record = service_record_service.update_record(db, record, payload.model_dump(exclude_unset=True))
    record_audit_event(db, action="service_record.update", actor_user_id=user.id, target_type="service_record", target_id=str(record.id))
    return record


@router.delete("/service-records/{record_id}", status_code=204)
def delete_service_record(record_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    record = _get_owned_record(db, record_id, user)
    service_record_service.delete_record(db, record)
    record_audit_event(db, action="service_record.delete", actor_user_id=user.id, target_type="service_record", target_id=str(record_id))
