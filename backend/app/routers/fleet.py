from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.session import get_db
from app.middleware.rbac import get_current_user
from app.models.fleet_account import FleetRole
from app.models.user import User
from app.repositories import fleet_repository, user_repository, vehicle_repository
from app.schemas.fleet import FleetAccountCreateIn, FleetAccountOut, FleetMemberAddIn, FleetMemberOut
from app.schemas.vehicle import VehicleOut
from app.services.audit_service import record_audit_event
from app.services.exceptions import ConflictError, ForbiddenError, NotFoundError

router = APIRouter(prefix="/api/v1/fleet", tags=["fleet"])


def _require_enabled():
    if not settings.fleet_pro_enabled:
        raise HTTPException(status_code=404, detail="Fleet Pro is not available yet.")


def _to_out(db: Session, fleet_account) -> FleetAccountOut:
    members = fleet_repository.list_members(db, fleet_account.id)
    users_by_id = {u.id: u for u in [user_repository.get_by_id(db, m.user_id) for m in members] if u}
    return FleetAccountOut(
        id=fleet_account.id,
        company_name=fleet_account.company_name,
        is_active=fleet_account.is_active,
        created_at=fleet_account.created_at,
        vehicles=[VehicleOut.model_validate(v) for v in vehicle_repository.list_by_fleet_account(db, fleet_account.id)],
        members=[
            FleetMemberOut(
                user_id=m.user_id,
                full_name=users_by_id[m.user_id].full_name if m.user_id in users_by_id else "",
                role=m.role,
                added_at=m.created_at,
            )
            for m in members
        ],
    )


@router.get("/mine", response_model=FleetAccountOut | None)
def get_my_fleet(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _require_enabled()
    account = fleet_repository.get_for_user(db, user.id)
    if account is None:
        return None
    return _to_out(db, account)


@router.post("", response_model=FleetAccountOut, status_code=201)
def create_fleet(payload: FleetAccountCreateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _require_enabled()
    if fleet_repository.get_for_user(db, user.id) is not None:
        raise ConflictError("You already belong to a fleet account.")
    account = fleet_repository.create_account(db, user.id, payload.company_name)
    record_audit_event(db, action="fleet.create", actor_user_id=user.id, target_type="fleet_account", target_id=str(account.id))
    return _to_out(db, account)


def _require_owner(db: Session, fleet_account_id: int, user: User):
    account = fleet_repository.get_by_id(db, fleet_account_id)
    if account is None:
        raise NotFoundError("Fleet account not found.")
    membership = fleet_repository.get_membership(db, fleet_account_id, user.id)
    if membership is None or membership.role != FleetRole.OWNER:
        raise ForbiddenError("Only the fleet owner can do this.")
    return account


@router.post("/{fleet_account_id}/vehicles/{vehicle_id}/attach", response_model=VehicleOut)
def attach_vehicle(
    fleet_account_id: int, vehicle_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    _require_enabled()
    _require_owner(db, fleet_account_id, user)

    vehicle = vehicle_repository.get_by_id(db, vehicle_id)
    if vehicle is None or vehicle.owner_id != user.id:
        raise NotFoundError("Vehicle not found.")

    vehicle = vehicle_repository.update(db, vehicle, {"fleet_account_id": fleet_account_id})
    record_audit_event(
        db, action="fleet.vehicle.attach", actor_user_id=user.id, target_type="vehicle", target_id=str(vehicle_id)
    )
    return vehicle


@router.post("/{fleet_account_id}/members", response_model=FleetMemberOut, status_code=201)
def add_member(
    fleet_account_id: int, payload: FleetMemberAddIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    _require_enabled()
    _require_owner(db, fleet_account_id, user)

    member_user = user_repository.get_by_email(db, payload.email)
    if member_user is None:
        raise NotFoundError("No account found with that email. They need to sign up first.")
    if fleet_repository.get_membership(db, fleet_account_id, member_user.id) is not None:
        raise ConflictError("That person is already on this fleet account.")

    member = fleet_repository.add_member(db, fleet_account_id, member_user.id, payload.role)
    record_audit_event(
        db, action="fleet.member.add", actor_user_id=user.id, target_type="fleet_account", target_id=str(fleet_account_id)
    )
    return FleetMemberOut(user_id=member_user.id, full_name=member_user.full_name, role=member.role, added_at=member.created_at)
