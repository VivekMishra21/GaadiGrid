from app.services.geo_service import haversine_km


def test_same_point_is_zero_distance():
    assert haversine_km(28.5708, 77.3260, 28.5708, 77.3260) == 0.0


def test_known_distance_delhi_to_mumbai_is_roughly_correct():
    # Delhi (28.6139, 77.2090) to Mumbai (19.0760, 72.8777) is ~1150km great-circle.
    distance = haversine_km(28.6139, 77.2090, 19.0760, 72.8777)
    assert 1100 < distance < 1200


def test_distance_is_symmetric():
    a = haversine_km(28.5708, 77.3260, 28.6273, 77.3720)
    b = haversine_km(28.6273, 77.3720, 28.5708, 77.3260)
    assert a == b


def test_small_nearby_distance_is_small():
    # Two points roughly 100m apart.
    distance = haversine_km(28.5708, 77.3260, 28.5717, 77.3260)
    assert 0 < distance < 0.2
