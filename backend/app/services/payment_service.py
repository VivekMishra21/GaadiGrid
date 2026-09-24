import json
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.integrations.payments import get_payment_adapter
from app.models.booking import Booking
from app.models.payment_order import PaymentOrder, PaymentOrderStatus
from app.models.refund import Refund, RefundStatus
from app.repositories import payment_order_repository, payment_webhook_event_repository, refund_repository
from app.services.exceptions import ConflictError, ValidationError


def create_payment_order(db: Session, booking: Booking) -> PaymentOrder:
    if payment_order_repository.get_paid_for_booking(db, booking.id):
        raise ConflictError("This booking has already been paid for.")

    latest = payment_order_repository.get_latest_for_booking(db, booking.id)
    if latest and latest.status == PaymentOrderStatus.CREATED:
        return latest  # an order is already awaiting payment — reuse it instead of spamming new ones

    adapter = get_payment_adapter()
    result = adapter.create_order(amount=booking.price_at_booking, currency="INR", receipt=f"booking-{booking.id}")

    return payment_order_repository.create(
        db,
        {
            "booking_id": booking.id,
            "customer_id": booking.customer_id,
            "gateway": settings.payment_provider,
            "gateway_order_id": result["gateway_order_id"],
            "amount": booking.price_at_booking,
            "currency": "INR",
            "status": PaymentOrderStatus.CREATED,
        },
    )


def process_webhook(db: Session, raw_body: bytes, signature: str) -> dict:
    """Idempotent: every call is recorded in PaymentWebhookEvent (valid or not, for
    forensics), and a gateway_event_id we've already recorded short-circuits without
    reprocessing — a gateway may redeliver the same event more than once."""
    adapter = get_payment_adapter()
    gateway = settings.payment_provider
    signature_valid = adapter.verify_webhook_signature(raw_body, signature)

    try:
        payload = json.loads(raw_body) if raw_body else {}
    except json.JSONDecodeError:
        payload = {}

    event_type = payload.get("event", "unknown")
    gateway_event_id = payload.get("id")
    order_id = payload.get("payload", {}).get("payment", {}).get("entity", {}).get("order_id")

    if gateway_event_id:
        existing = payment_webhook_event_repository.get_by_gateway_event_id(db, gateway, gateway_event_id)
        if existing:
            return {"status": "already_processed"}

    payment_webhook_event_repository.create(
        db,
        {
            "gateway": gateway,
            "gateway_event_id": gateway_event_id,
            "event_type": event_type,
            "gateway_order_id": order_id,
            "signature_valid": signature_valid,
            "raw_payload": payload,
        },
    )

    if not signature_valid:
        raise ValidationError("Invalid webhook signature.")

    if not order_id:
        return {"status": "ignored", "reason": "no order_id in payload"}

    order = payment_order_repository.get_by_gateway_order_id(db, order_id)
    if order is None:
        return {"status": "ignored", "reason": "unknown order"}

    if event_type == "payment.captured" and order.status == PaymentOrderStatus.CREATED:
        payment_order_repository.update(
            db, order, {"status": PaymentOrderStatus.PAID, "paid_at": datetime.now(timezone.utc)}
        )
    elif event_type == "payment.failed" and order.status == PaymentOrderStatus.CREATED:
        payment_order_repository.update(
            db, order, {"status": PaymentOrderStatus.FAILED, "failed_at": datetime.now(timezone.utc)}
        )

    return {"status": "processed"}


def simulate_dev_payment_completion(db: Session, order: PaymentOrder, success: bool) -> dict:
    """Dev-only: builds a real HMAC-signed webhook payload (via DevPaymentAdapter) and
    feeds it through the exact same process_webhook() path a real gateway callback
    would use — the signature-verification and processing logic is genuinely
    exercised, not bypassed for the simulation."""
    if settings.payment_provider != "dev":
        raise ValidationError("Dev payment completion is only available when PAYMENT_PROVIDER=dev.")

    adapter = get_payment_adapter()
    event_type = "payment.captured" if success else "payment.failed"
    payload = {
        "event": event_type,
        "id": f"evt_dev_{uuid.uuid4().hex[:16]}",
        "payload": {
            "payment": {"entity": {"order_id": order.gateway_order_id, "id": f"pay_dev_{uuid.uuid4().hex[:16]}"}}
        },
    }
    raw_body = json.dumps(payload).encode()
    signature = adapter.sign_payload(raw_body)
    return process_webhook(db, raw_body, signature)


def issue_refund(db: Session, booking: Booking, initiated_by_role: str, reason: str | None) -> Refund | None:
    """Issues a full refund if the booking has a PAID payment order; returns None when
    there's nothing to refund (the booking was never paid)."""
    paid_order = payment_order_repository.get_paid_for_booking(db, booking.id)
    if paid_order is None:
        return None

    adapter = get_payment_adapter()
    result = adapter.create_refund(gateway_payment_id=paid_order.gateway_order_id, amount=paid_order.amount)

    refund = refund_repository.create(
        db,
        {
            "payment_order_id": paid_order.id,
            "booking_id": booking.id,
            "amount": paid_order.amount,
            "reason": reason,
            "initiated_by_role": initiated_by_role,
            "status": RefundStatus.PROCESSED,
            "gateway_refund_id": result["gateway_refund_id"],
            "processed_at": datetime.now(timezone.utc),
        },
    )
    payment_order_repository.update(db, paid_order, {"status": PaymentOrderStatus.REFUNDED})
    return refund
