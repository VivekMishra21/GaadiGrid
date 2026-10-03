"""Smart Pit Stop — suggests fuel/CNG stations and bookable vehicle-care services
along a straight line between two points.

This is deliberately NOT turn-by-turn routing: no Google Routes (or other routing
provider) API key is configured for this project, and inventing road-distance/time
numbers without one would violate the "never present sample data as live data" rule.
Instead this computes real geodesic distance from each candidate to the straight
origin-destination line and only ever labels it as that — see PitStopSuggestionsOut.note
and PitStopStationOut/PitStopProviderOut.distance_from_route_km. Fuel stations use
PostGIS (station_repository.search_along_route); providers have no geography column,
so this does the same point-to-segment distance calculation in Python instead.
"""

import math
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models.provider import Provider
from app.repositories import provider_repository, station_repository

# Equirectangular (flat-earth) approximation — accurate to a few metres at the
# city/regional scale this feature operates at (a couple hundred km at most), which is
# more than good enough for "is this provider within N km of the route" filtering.
_EARTH_RADIUS_KM = 6371.0


def _to_local_km(lat: float, lng: float, ref_lat: float) -> tuple[float, float]:
    x = math.radians(lng) * math.cos(math.radians(ref_lat)) * _EARTH_RADIUS_KM
    y = math.radians(lat) * _EARTH_RADIUS_KM
    return x, y


def _distance_to_segment_km(
    point_lat: float, point_lng: float, a_lat: float, a_lng: float, b_lat: float, b_lng: float
) -> float:
    ref_lat = a_lat
    px, py = _to_local_km(point_lat, point_lng, ref_lat)
    ax, ay = _to_local_km(a_lat, a_lng, ref_lat)
    bx, by = _to_local_km(b_lat, b_lng, ref_lat)

    seg_x, seg_y = bx - ax, by - ay
    seg_len_sq = seg_x * seg_x + seg_y * seg_y
    if seg_len_sq == 0:
        t = 0.0
    else:
        t = max(0.0, min(1.0, ((px - ax) * seg_x + (py - ay) * seg_y) / seg_len_sq))

    closest_x, closest_y = ax + t * seg_x, ay + t * seg_y
    return math.hypot(px - closest_x, py - closest_y)


@dataclass
class ProviderAlongRoute:
    provider: Provider
    distance_from_route_km: float


def find_providers_along_route(
    db: Session,
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    buffer_km: float,
    limit: int,
) -> list[ProviderAlongRoute]:
    candidates = provider_repository.list_active_with_location(db)
    scored = [
        ProviderAlongRoute(
            provider=p,
            distance_from_route_km=round(
                _distance_to_segment_km(p.latitude, p.longitude, origin_lat, origin_lng, dest_lat, dest_lng), 2
            ),
        )
        for p in candidates
    ]
    within_buffer = [s for s in scored if s.distance_from_route_km <= buffer_km]
    within_buffer.sort(key=lambda s: s.distance_from_route_km)
    return within_buffer[:limit]


def find_stations_along_route(
    db: Session,
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    buffer_km: float,
    limit: int,
):
    return station_repository.search_along_route(db, origin_lat, origin_lng, dest_lat, dest_lng, buffer_km, limit)


# What the user can say their vehicle needs, mapped to the service categories that
# satisfy it. Matching is on real, active service packages - nothing is inferred about the
# vehicle's condition.
NEED_CATEGORIES = {
    "CAR_WASH": ["CAR_WASH", "DETAILING"],
    "GENERAL_SERVICE": ["GENERAL_SERVICE"],
    "TYRE_SERVICE": ["TYRE_SERVICE"],
    "BATTERY_SERVICE": ["BATTERY_SERVICE"],
    "AC_SERVICE": ["AC_SERVICE"],
    "DENTING_PAINTING": ["DENTING_PAINTING"],
}


@dataclass
class ProviderForNeed:
    provider: Provider
    distance_km: float
    packages: list


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = phi2 - phi1
    d_lambda = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * _EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def find_providers_for_need(
    db: Session, need: str, lat: float, lng: float, radius_km: float, limit: int
) -> list[ProviderForNeed]:
    """Active providers within `radius_km` of the point that currently sell a service
    matching `need`, nearest first, each with their matching packages (cheapest first)."""
    from app.repositories import service_package_repository

    categories = NEED_CATEGORIES[need]
    candidates = provider_repository.list_active_with_location(db)
    near = [(p, round(_haversine_km(lat, lng, p.latitude, p.longitude), 2)) for p in candidates]
    near = [(p, d) for p, d in near if d <= radius_km]
    packages = service_package_repository.list_active_in_categories_for_providers(db, [p.id for p, _ in near], categories)

    by_provider: dict[int, list] = {}
    for package in packages:
        by_provider.setdefault(package.provider_id, []).append(package)

    results = [ProviderForNeed(provider=p, distance_km=d, packages=by_provider[p.id]) for p, d in near if p.id in by_provider]
    results.sort(key=lambda r: r.distance_km)
    return results[:limit]
