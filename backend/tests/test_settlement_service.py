from app.services.settlement_service import calculate_commission


def test_calculates_commission_and_net_at_default_rate():
    commission, net = calculate_commission(1000.0, 0.15)
    assert commission == 150.0
    assert net == 850.0


def test_zero_commission_rate_yields_full_net_amount():
    commission, net = calculate_commission(500.0, 0.0)
    assert commission == 0.0
    assert net == 500.0


def test_rounds_to_two_decimal_places():
    commission, net = calculate_commission(99.99, 0.15)
    assert commission == round(99.99 * 0.15, 2)
    assert round(commission + net, 2) == 99.99


def test_commission_and_net_always_sum_to_gross():
    for gross, rate in [(799.0, 0.15), (249.0, 0.1), (1499.0, 0.2), (33.33, 0.15)]:
        commission, net = calculate_commission(gross, rate)
        assert round(commission + net, 2) == round(gross, 2)
