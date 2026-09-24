from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.expense import Expense


def get_by_id(db: Session, expense_id: int) -> Expense | None:
    return db.get(Expense, expense_id)


def list_for_vehicle(
    db: Session, vehicle_id: int, category: str | None, offset: int, limit: int
) -> tuple[list[Expense], int]:
    query = select(Expense).where(Expense.vehicle_id == vehicle_id)
    count_query = select(func.count(Expense.id)).where(Expense.vehicle_id == vehicle_id)
    if category:
        query = query.where(Expense.category == category)
        count_query = count_query.where(Expense.category == category)

    total = db.scalar(count_query)
    items = db.scalars(query.order_by(Expense.expense_date.desc(), Expense.id.desc()).offset(offset).limit(limit)).all()
    return list(items), int(total or 0)


def sum_by_category_for_vehicle(db: Session, vehicle_id: int) -> dict[str, float]:
    """A SQL `GROUP BY` aggregate rather than loading every expense row for the vehicle
    into Python and summing there — a vehicle's expense history is one of the few
    genuinely unbounded-over-time lists in this app (years of fuel/service/fine
    entries), so this stays O(1) result rows regardless of how many expenses exist."""
    rows = db.execute(
        select(Expense.category, func.sum(Expense.amount)).where(Expense.vehicle_id == vehicle_id).group_by(Expense.category)
    ).all()
    return {category: float(total) for category, total in rows}


def create(db: Session, owner_id: int, vehicle_id: int, data: dict) -> Expense:
    expense = Expense(owner_id=owner_id, vehicle_id=vehicle_id, **data)
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


def update(db: Session, expense: Expense, data: dict) -> Expense:
    for field, value in data.items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return expense


def delete(db: Session, expense: Expense) -> None:
    db.delete(expense)
    db.commit()
