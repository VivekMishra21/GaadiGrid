import hashlib
import hmac
import uuid

from app.core.config import RAZORPAY_ENABLED, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, SECRET_KEY

_client = None
if RAZORPAY_ENABLED:
    import razorpay

    _client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


def create_order(amount_rupees: float, receipt: str) -> tuple[str, str]:
    """Returns (provider_order_id, mode)."""
    if _client is not None:
        order = _client.order.create(
            {
                "amount": int(round(amount_rupees * 100)),
                "currency": "INR",
                "receipt": receipt,
                "payment_capture": 1,
            }
        )
        return order["id"], "razorpay"

    return f"order_sim_{uuid.uuid4().hex[:18]}", "test_simulation"


def verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    if _client is not None:
        try:
            _client.utility.verify_payment_signature(
                {
                    "razorpay_order_id": order_id,
                    "razorpay_payment_id": payment_id,
                    "razorpay_signature": signature,
                }
            )
            return True
        except razorpay.errors.SignatureVerificationError:
            return False

    expected = hmac.new(SECRET_KEY.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def refund_payment(payment_id: str, amount_rupees: float) -> None:
    if _client is not None:
        _client.payment.refund(payment_id, {"amount": int(round(amount_rupees * 100))})
