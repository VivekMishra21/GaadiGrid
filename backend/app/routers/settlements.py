from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.constants import Role
from app.database.session import get_db
from app.middleware.rbac import get_current_user, require_roles
from app.models.settlement import SettlementStatus
from app.models.user import User
from app.repositories import provider_repository, settlement_repository
from app.schemas.common import PaginatedResponse, paginate
from app.schemas.settlement import SettlementOut
from app.services.audit_service import record_audit_event
from app.services.exceptions import ForbiddenError, NotFoundError, ValidationError

router = APIRouter(prefix="/api/v1/providers/{provider_id}/settlements", tags=["settlements"])
admin_router = APIRouter(prefix="/api/v1/admin/settlements", tags=["settlements"])


@router.get("", response_model=PaginatedResponse[SettlementOut])
def list_provider_settlements(
    provider_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    provider = provider_repository.get_by_id(db, provider_id)
    if provider is None:
        raise NotFoundError("Provider not found.")
    if provider.owner_user_id != user.id and user.role not in Role.ADMIN_ROLES:
        raise ForbiddenError("You do not manage this provider.")

    offset = (page - 1) * page_size
    items, total = settlement_repository.list_for_provider(db, provider_id, offset, page_size)
    return paginate([SettlementOut.model_validate(s) for s in items], total, page, page_size)


@admin_router.get("", response_model=PaginatedResponse[SettlementOut])
def list_all_settlements(
    status: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(*Role.ADMIN_ROLES)),
):
    if status and status not in SettlementStatus.ALL:
        raise ValidationError(f"status must be one of {SettlementStatus.ALL}")

    offset = (page - 1) * page_size
    items, total = settlement_repository.list_all(db, status, offset, page_size)
    return paginate([SettlementOut.model_validate(s) for s in items], total, page, page_size)


@admin_router.post("/{settlement_id}/pay-out", response_model=SettlementOut)
def pay_out_settlement(
    settlement_id: int, db: Session = Depends(get_db), admin: User = Depends(require_roles(*Role.ADMIN_ROLES))
):
    settlement = settlement_repository.get_by_id(db, settlement_id)
    if settlement is None:
        raise NotFoundError("Settlement not found.")
    if settlement.status == SettlementStatus.PAID_OUT:
        raise ValidationError("This settlement has already been paid out.")

    settlement = settlement_repository.update(
        db, settlement, {"status": SettlementStatus.PAID_OUT, "paid_out_at": datetime.now(timezone.utc)}
    )
    record_audit_event(
        db, action="settlement.pay_out", actor_user_id=admin.id, target_type="settlement", target_id=str(settlement_id)
    )
    return settlement
