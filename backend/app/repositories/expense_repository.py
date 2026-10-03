from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.models.service_record import ServiceRecord


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


def list_recent_for_vehicle(db: Session, vehicle_id: int, limit: int) -> list[Expense]:
    return list(
        db.scalars(
            select(Expense).where(Expense.vehicle_id == vehicle_id).order_by(Expense.expense_date.desc(), Expense.id.desc()).limit(limit)
        ).all()
    )


def sum_by_month_and_category_for_vehicle(db: Session, vehicle_id: int, since: date) -> dict[tuple[str, str], float]:
    """`{("YYYY-MM", category): total}` for expenses dated on/after `since` — a GROUP BY
    so the result size is bounded by months x categories, not by how many expenses exist."""
    month = func.to_char(Expense.expense_date, "YYYY-MM")
    rows = db.execute(
        select(month, Expense.category, func.sum(Expense.amount))
        .where(Expense.vehicle_id == vehicle_id, Expense.expense_date >= since)
        .group_by(month, Expense.category)
    ).all()
    return {(m, category): float(total) for m, category, total in rows}


def list_recent_unlinked_for_vehicle(db: Session, vehicle_id: int, limit: int) -> list[Expense]:
    """Recent expenses that are not already represented by a service record — a record
    owns its linked expense, so listing both in the timeline would show one spend twice."""
    linked = select(ServiceRecord.expense_id).where(ServiceRecord.expense_id.is_not(None))
    return list(
        db.scalars(
            select(Expense)
            .where(Expense.vehicle_id == vehicle_id, Expense.id.notin_(linked))
            .order_by(Expense.expense_date.desc(), Expense.id.desc())
            .limit(limit)
        ).all()
    )


def count_for_vehicle(db: Session, vehicle_id: int) -> int:
    return int(db.scalar(select(func.count(Expense.id)).where(Expense.vehicle_id == vehicle_id)) or 0)


def sum_between(db: Session, vehicle_id: int, after: date, until: date) -> float:
    """Expenses dated after `after` (exclusive) up to and including `until`."""
    total = db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0.0)).where(
            Expense.vehicle_id == vehicle_id, Expense.expense_date > after, Expense.expense_date <= until
        )
    )
    return float(total or 0.0)


def sum_by_vehicle(db: Session, vehicle_ids: list[int], since: date) -> dict[int, float]:
    if not vehicle_ids:
        return {}
    rows = db.execute(
        select(Expense.vehicle_id, func.sum(Expense.amount))
        .where(Expense.vehicle_id.in_(vehicle_ids), Expense.expense_date >= since)
        .group_by(Expense.vehicle_id)
    ).all()
    return {vehicle_id: float(total) for vehicle_id, total in rows}
