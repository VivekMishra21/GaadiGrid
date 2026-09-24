import hashlib
import hmac
import logging
import uuid
from abc import ABC, abstractmethod

from app.core.config import settings

logger = logging.getLogger("gaadigrid.payments")


class PaymentAdapter(ABC):
    """Interface every payment gateway adapter must implement. Swap the active
    adapter via the PAYMENT_PROVIDER environment variable — no call-site changes
    needed."""

    @abstractmethod
    def create_order(self, amount: float, currency: str, receipt: str) -> dict:
        """Returns {"gateway_order_id": str}."""
        ...

    @abstractmethod
    def verify_webhook_signature(self, raw_body: bytes, signature: str) -> bool: ...

    @abstractmethod
    def create_refund(self, gateway_payment_id: str, amount: float) -> dict:
        """Returns {"gateway_refund_id": str}."""
        ...


class DevPaymentAdapter(PaymentAdapter):
    """Development-only adapter. Never talks to a real payment gateway — orders and
    refunds are simulated locally with fake gateway ids. Webhook signatures are real
    HMAC-SHA256 (using DEV_PAYMENT_WEBHOOK_SECRET), so the signature-verification
    code path is genuinely exercised in dev mode, not skipped or faked."""

    def create_order(self, amount: float, currency: str, receipt: str) -> dict:
        logger.info("dev_payment_adapter: simulated order created for receipt=%s amount=%s", receipt, amount)
        return {"gateway_order_id": f"order_dev_{uuid.uuid4().hex[:16]}"}

    def sign_payload(self, raw_body: bytes) -> str:
        return hmac.new(settings.dev_payment_webhook_secret.encode(), raw_body, hashlib.sha256).hexdigest()

    def verify_webhook_signature(self, raw_body: bytes, signature: str) -> bool:
        expected = self.sign_payload(raw_body)
        return hmac.compare_digest(expected, signature or "")

    def create_refund(self, gateway_payment_id: str, amount: float) -> dict:
        logger.info("dev_payment_adapter: simulated refund for payment=%s amount=%s", gateway_payment_id, amount)
        return {"gateway_refund_id": f"rfnd_dev_{uuid.uuid4().hex[:16]}"}


class RazorpayAdapter(PaymentAdapter):
    """Production adapter. Webhook signature verification below is the real Razorpay
    algorithm (HMAC-SHA256 of the raw request body using RAZORPAY_WEBHOOK_SECRET) and
    works today given a real secret. Order creation and refund issuance need the
    Razorpay SDK/API wired up with real credentials before PAYMENT_PROVIDER=razorpay
    is used anywhere outside development."""

    def create_order(self, amount: float, currency: str, receipt: str) -> dict:
        raise NotImplementedError(
            "RazorpayAdapter.create_order is not implemented yet. Set PAYMENT_PROVIDER=dev for local "
            "development, or implement this against the Razorpay Orders API with real credentials."
        )

    def verify_webhook_signature(self, raw_body: bytes, signature: str) -> bool:
        if not settings.razorpay_webhook_secret:
            return False
        expected = hmac.new(settings.razorpay_webhook_secret.encode(), raw_body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature or "")

    def create_refund(self, gateway_payment_id: str, amount: float) -> dict:
        raise NotImplementedError(
            "RazorpayAdapter.create_refund is not implemented yet. Implement this against the Razorpay "
            "Refunds API with real credentials before using PAYMENT_PROVIDER=razorpay."
        )


def get_payment_adapter() -> PaymentAdapter:
    if settings.payment_provider == "razorpay":
        return RazorpayAdapter()
    return DevPaymentAdapter()
