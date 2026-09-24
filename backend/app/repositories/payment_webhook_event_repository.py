from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.payment_webhook_event import PaymentWebhookEvent


def create(db: Session, data: dict) -> PaymentWebhookEvent:
    event = PaymentWebhookEvent(**data)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def get_by_gateway_event_id(db: Session, gateway: str, gateway_event_id: str) -> PaymentWebhookEvent | None:
    if not gateway_event_id:
        return None
    return db.scalars(
        select(PaymentWebhookEvent).where(
            PaymentWebhookEvent.gateway == gateway, PaymentWebhookEvent.gateway_event_id == gateway_event_id
        )
    ).first()
