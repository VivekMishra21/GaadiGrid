from app.integrations.payments import DevPaymentAdapter, RazorpayAdapter


def test_create_order_returns_a_unique_gateway_order_id():
    adapter = DevPaymentAdapter()
    order1 = adapter.create_order(100.0, "INR", "receipt-1")
    order2 = adapter.create_order(100.0, "INR", "receipt-2")
    assert order1["gateway_order_id"] != order2["gateway_order_id"]
    assert order1["gateway_order_id"].startswith("order_dev_")


def test_signed_payload_verifies_correctly():
    adapter = DevPaymentAdapter()
    body = b'{"event": "payment.captured"}'
    signature = adapter.sign_payload(body)
    assert adapter.verify_webhook_signature(body, signature) is True


def test_tampered_payload_fails_verification():
    adapter = DevPaymentAdapter()
    body = b'{"event": "payment.captured"}'
    signature = adapter.sign_payload(body)
    tampered = b'{"event": "payment.captured", "extra": "field"}'
    assert adapter.verify_webhook_signature(tampered, signature) is False


def test_missing_signature_fails_verification():
    adapter = DevPaymentAdapter()
    body = b'{"event": "payment.captured"}'
    assert adapter.verify_webhook_signature(body, "") is False
    assert adapter.verify_webhook_signature(body, None) is False


def test_create_refund_returns_a_gateway_refund_id():
    adapter = DevPaymentAdapter()
    result = adapter.create_refund("pay_dev_abc123", 50.0)
    assert result["gateway_refund_id"].startswith("rfnd_dev_")


def test_razorpay_adapter_order_creation_is_not_implemented():
    adapter = RazorpayAdapter()
    try:
        adapter.create_order(100.0, "INR", "receipt-1")
        assert False, "expected NotImplementedError"
    except NotImplementedError:
        pass


def test_razorpay_adapter_refund_is_not_implemented():
    adapter = RazorpayAdapter()
    try:
        adapter.create_refund("pay_xyz", 50.0)
        assert False, "expected NotImplementedError"
    except NotImplementedError:
        pass


def test_razorpay_adapter_rejects_webhook_without_configured_secret():
    adapter = RazorpayAdapter()
    # settings.razorpay_webhook_secret is empty in the dev/test environment
    assert adapter.verify_webhook_signature(b"{}", "anything") is False
