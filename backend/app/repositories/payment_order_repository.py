from sqlalchemy import func, select
from sqlalchemy.orm import Session, aliased

from app.models.payment_order import PaymentOrder, PaymentOrderStatus


def create(db: Session, data: dict) -> PaymentOrder:
    order = PaymentOrder(**data)
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def get_by_id(db: Session, order_id: int) -> PaymentOrder | None:
    return db.get(PaymentOrder, order_id)


def get_by_gateway_order_id(db: Session, gateway_order_id: str) -> PaymentOrder | None:
    return db.scalars(select(PaymentOrder).where(PaymentOrder.gateway_order_id == gateway_order_id)).first()


def get_latest_for_booking(db: Session, booking_id: int) -> PaymentOrder | None:
    return db.scalars(
        select(PaymentOrder).where(PaymentOrder.booking_id == booking_id).order_by(PaymentOrder.created_at.desc())
    ).first()


def get_latest_for_bookings(db: Session, booking_ids: list[int]) -> dict[int, PaymentOrder]:
    """Batched form of `get_latest_for_booking` for a whole page of bookings at once
    (booking list endpoints) — one query instead of one per booking, via the same
    "rank within each booking, keep rank 1" window-function pattern used for
    per-station queue status."""
    if not booking_ids:
        return {}

    ranked = (
        select(
            PaymentOrder,
            func.row_number().over(partition_by=PaymentOrder.booking_id, order_by=PaymentOrder.created_at.desc()).label("rank"),
        )
        .where(PaymentOrder.booking_id.in_(booking_ids))
        .subquery()
    )
    ranked_order = aliased(PaymentOrder, ranked)
    orders = db.scalars(select(ranked_order).where(ranked.c.rank == 1)).all()
    return {order.booking_id: order for order in orders}


def get_paid_for_booking(db: Session, booking_id: int) -> PaymentOrder | None:
    return db.scalars(
        select(PaymentOrder)
        .where(PaymentOrder.booking_id == booking_id, PaymentOrder.status == PaymentOrderStatus.PAID)
        .order_by(PaymentOrder.created_at.desc())
    ).first()


def update(db: Session, order: PaymentOrder, data: dict) -> PaymentOrder:
    for field, value in data.items():
        setattr(order, field, value)
    db.commit()
    db.refresh(order)
    return order
