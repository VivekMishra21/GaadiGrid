from sqlalchemy import select
from sqlalchemy.orm import Session

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
