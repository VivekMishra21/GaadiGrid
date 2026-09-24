from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.constants import Role
from app.database.session import get_db
from app.middleware.rbac import require_roles
from app.repositories import dispute_repository, provider_repository, user_repository
from app.schemas.auth import UserOut
from app.schemas.common import PaginatedResponse, paginate
from app.schemas.dispute import DisputeOut, DisputeResolveIn
from app.schemas.provider import ProviderManagerDetailOut, VerificationRejectIn
from app.services import dispute_service, provider_verification_service
from app.services.audit_service import record_audit_event
from app.services.exceptions import ForbiddenError, NotFoundError, ValidationError

# providers.py never imports admin.py, so importing its response-building helpers
# here (to avoid duplicating how a ProviderManagerDetailOut gets built) is safe.
from app.routers.providers import _provider_manager_detail, build_provider_manager_details

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

# Only these roles can be moderated via the admin deactivate/reactivate endpoints —
# an admin locking out another admin (or themselves) is a self-inflicted outage this
# endpoint deliberately can't cause.
MODERATABLE_ROLES = (Role.CUSTOMER, Role.PROVIDER_OWNER, Role.PROVIDER_STAFF)


@router.get("/users", response_model=PaginatedResponse[UserOut])
def list_users(
    role: str | None = None,
    q: str | None = None,
    is_active: bool | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin=Depends(require_roles(*Role.ADMIN_ROLES)),
):
    if role and role not in Role.ALL:
        raise ValidationError(f"role must be one of {Role.ALL}")

    offset = (page - 1) * page_size
    users, total = user_repository.list_all(db, offset, page_size, role=role, q=q, is_active=is_active)
    return paginate([UserOut.model_validate(u) for u in users], total, page, page_size)


@router.post("/users/{user_id}/deactivate", response_model=UserOut)
def deactivate_user(
    user_id: int, db: Session = Depends(get_db), admin=Depends(require_roles(*Role.ADMIN_ROLES))
):
    target = user_repository.get_by_id(db, user_id)
    if target is None:
        raise NotFoundError("User not found.")
    if target.id == admin.id:
        raise ForbiddenError("You cannot deactivate your own account.")
    if target.role not in MODERATABLE_ROLES:
        raise ForbiddenError("Admin and super-admin accounts cannot be deactivated from this screen.")

    target = user_repository.set_active(db, target, False)
    record_audit_event(db, action="user.deactivate", actor_user_id=admin.id, target_type="user", target_id=str(user_id))
    return target


@router.post("/users/{user_id}/reactivate", response_model=UserOut)
def reactivate_user(
    user_id: int, db: Session = Depends(get_db), admin=Depends(require_roles(*Role.ADMIN_ROLES))
):
    target = user_repository.get_by_id(db, user_id)
    if target is None:
        raise NotFoundError("User not found.")

    target = user_repository.set_active(db, target, True)
    record_audit_event(db, action="user.reactivate", actor_user_id=admin.id, target_type="user", target_id=str(user_id))
    return target


@router.get("/providers", response_model=PaginatedResponse[ProviderManagerDetailOut])
def list_providers_for_admin(
    verification_status: str | None = None,
    q: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin=Depends(require_roles(*Role.ADMIN_ROLES)),
):
    offset = (page - 1) * page_size
    providers, total = provider_repository.list_all_for_admin(db, verification_status, q, offset, page_size)
    items = build_provider_manager_details(db, providers)
    return paginate(items, total, page, page_size)


@router.post("/providers/{provider_id}/verify", response_model=ProviderManagerDetailOut)
def verify_provider(
    provider_id: int, db: Session = Depends(get_db), admin=Depends(require_roles(*Role.ADMIN_ROLES))
):
    provider = provider_repository.get_by_id(db, provider_id)
    if provider is None:
        raise NotFoundError("Provider not found.")
    provider = provider_verification_service.approve_verification(db, provider)
    record_audit_event(db, action="provider.verify", actor_user_id=admin.id, target_type="provider", target_id=str(provider_id))

    return _provider_manager_detail(db, provider)


@router.post("/providers/{provider_id}/reject", response_model=ProviderManagerDetailOut)
def reject_provider(
    provider_id: int,
    payload: VerificationRejectIn,
    db: Session = Depends(get_db),
    admin=Depends(require_roles(*Role.ADMIN_ROLES)),
):
    provider = provider_repository.get_by_id(db, provider_id)
    if provider is None:
        raise NotFoundError("Provider not found.")
    provider = provider_verification_service.reject_verification(db, provider, payload.reason)
    record_audit_event(db, action="provider.reject", actor_user_id=admin.id, target_type="provider", target_id=str(provider_id))

    return _provider_manager_detail(db, provider)


@router.post("/providers/{provider_id}/deactivate", response_model=ProviderManagerDetailOut)
def deactivate_provider(
    provider_id: int, db: Session = Depends(get_db), admin=Depends(require_roles(*Role.ADMIN_ROLES))
):
    provider = provider_repository.get_by_id(db, provider_id)
    if provider is None:
        raise NotFoundError("Provider not found.")
    provider = provider_repository.update(db, provider, {"is_active": False})
    record_audit_event(db, action="provider.deactivate", actor_user_id=admin.id, target_type="provider", target_id=str(provider_id))

    return _provider_manager_detail(db, provider)


@router.post("/providers/{provider_id}/reactivate", response_model=ProviderManagerDetailOut)
def reactivate_provider(
    provider_id: int, db: Session = Depends(get_db), admin=Depends(require_roles(*Role.ADMIN_ROLES))
):
    provider = provider_repository.get_by_id(db, provider_id)
    if provider is None:
        raise NotFoundError("Provider not found.")
    provider = provider_repository.update(db, provider, {"is_active": True})
    record_audit_event(db, action="provider.reactivate", actor_user_id=admin.id, target_type="provider", target_id=str(provider_id))

    return _provider_manager_detail(db, provider)


@router.get("/disputes", response_model=PaginatedResponse[DisputeOut])
def list_disputes(
    status: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin=Depends(require_roles(*Role.ADMIN_ROLES)),
):
    offset = (page - 1) * page_size
    items, total = dispute_repository.list_all(db, status, offset, page_size)
    return paginate([DisputeOut.model_validate(d) for d in items], total, page, page_size)


@router.post("/disputes/{dispute_id}/resolve", response_model=DisputeOut)
def resolve_dispute(
    dispute_id: int,
    payload: DisputeResolveIn,
    db: Session = Depends(get_db),
    admin=Depends(require_roles(*Role.ADMIN_ROLES)),
):
    dispute = dispute_repository.get_by_id(db, dispute_id)
    if dispute is None:
        raise NotFoundError("Dispute not found.")
    dispute = dispute_service.resolve_dispute(db, dispute, payload.status, payload.resolution_note, admin.id)
    record_audit_event(db, action="dispute.resolve", actor_user_id=admin.id, target_type="dispute", target_id=str(dispute_id))
    return dispute
