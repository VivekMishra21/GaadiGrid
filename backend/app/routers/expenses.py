from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.middleware.rbac import get_current_user
from app.models.expense import Expense
from app.models.user import User
from app.repositories import expense_repository, vehicle_repository
from app.schemas.common import PaginatedResponse, paginate
from app.schemas.expense import ExpenseCreateIn, ExpenseOut, ExpenseSummaryOut, ExpenseUpdateIn
from app.services import expense_service
from app.services.audit_service import record_audit_event
from app.services.exceptions import ForbiddenError, NotFoundError

router = APIRouter(prefix="/api/v1", tags=["expenses"])


def _get_owned_vehicle(db: Session, vehicle_id: int, user: User):
    vehicle = vehicle_repository.get_by_id(db, vehicle_id)
    if vehicle is None:
        raise NotFoundError("Vehicle not found.")
    if vehicle.owner_id != user.id:
        raise ForbiddenError("You do not have access to this vehicle.")
    return vehicle


def _get_owned_expense(db: Session, expense_id: int, user: User) -> Expense:
    expense = expense_repository.get_by_id(db, expense_id)
    if expense is None:
        raise NotFoundError("Expense not found.")
    if expense.owner_id != user.id:
        raise ForbiddenError("You do not have access to this expense.")
    return expense


@router.get("/vehicles/{vehicle_id}/expenses", response_model=PaginatedResponse[ExpenseOut])
def list_expenses(
    vehicle_id: int,
    category: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_owned_vehicle(db, vehicle_id, user)
    offset = (page - 1) * page_size
    items, total = expense_repository.list_for_vehicle(db, vehicle_id, category, offset, page_size)
    return paginate([ExpenseOut.model_validate(e) for e in items], total, page, page_size)


@router.get("/vehicles/{vehicle_id}/expenses/summary", response_model=ExpenseSummaryOut)
def get_expense_summary(vehicle_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _get_owned_vehicle(db, vehicle_id, user)
    category_sums = expense_repository.sum_by_category_for_vehicle(db, vehicle_id)
    return expense_service.summarize(category_sums)


@router.post("/vehicles/{vehicle_id}/expenses", response_model=ExpenseOut, status_code=201)
def create_expense(
    vehicle_id: int, payload: ExpenseCreateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    _get_owned_vehicle(db, vehicle_id, user)
    expense = expense_repository.create(db, user.id, vehicle_id, payload.model_dump())
    record_audit_event(db, action="expense.create", actor_user_id=user.id, target_type="expense", target_id=str(expense.id))
    return expense


@router.put("/expenses/{expense_id}", response_model=ExpenseOut)
def update_expense(
    expense_id: int, payload: ExpenseUpdateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    expense = _get_owned_expense(db, expense_id, user)
    updated = expense_repository.update(db, expense, payload.model_dump(exclude_unset=True))
    record_audit_event(db, action="expense.update", actor_user_id=user.id, target_type="expense", target_id=str(expense_id))
    return updated


@router.delete("/expenses/{expense_id}", status_code=204)
def delete_expense(expense_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    expense = _get_owned_expense(db, expense_id, user)
    expense_repository.delete(db, expense)
    record_audit_event(db, action="expense.delete", actor_user_id=user.id, target_type="expense", target_id=str(expense_id))
