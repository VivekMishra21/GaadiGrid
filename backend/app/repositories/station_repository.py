from geoalchemy2 import functions as geo_func
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.fuel_price import FuelPrice
from app.models.fuel_station import FuelStation
from app.models.fuel_type import FuelType


def _point_wkt(lat: float, lng: float) -> str:
    return f"SRID=4326;POINT({lng} {lat})"


def _line_wkt(origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float) -> str:
    return f"SRID=4326;LINESTRING({origin_lng} {origin_lat}, {dest_lng} {dest_lat})"


def create(db: Session, data: dict) -> FuelStation:
    station = FuelStation(**data, location=func.ST_GeogFromText(_point_wkt(data["latitude"], data["longitude"])))
    db.add(station)
    db.commit()
    db.refresh(station)
    return station


def update(db: Session, station: FuelStation, data: dict) -> FuelStation:
    for field, value in data.items():
        setattr(station, field, value)

    if "latitude" in data or "longitude" in data:
        station.location = func.ST_GeogFromText(_point_wkt(station.latitude, station.longitude))

    db.commit()
    db.refresh(station)
    return station


def get_by_id(db: Session, station_id: int) -> FuelStation | None:
    station = db.get(FuelStation, station_id)
    if station is not None and station.deleted_at is not None:
        return None
    return station


def list_by_ids(db: Session, station_ids: list[int]) -> list[FuelStation]:
    """Batched form of `get_by_id` for a known set of ids (e.g. a user's favorites) —
    one query instead of one per id. Order isn't guaranteed to match `station_ids`."""
    if not station_ids:
        return []
    return list(
        db.scalars(
            select(FuelStation).where(FuelStation.id.in_(station_ids), FuelStation.deleted_at.is_(None))
        ).all()
    )


def _apply_filters(query, city: str | None, q: str | None, fuel_type_code: str | None):
    if city:
        query = query.where(func.lower(FuelStation.city) == city.lower())

    if q:
        like = f"%{q}%"
        query = query.where(
            (FuelStation.name.ilike(like)) | (FuelStation.locality.ilike(like)) | (FuelStation.address.ilike(like))
        )

    if fuel_type_code:
        query = query.where(
            FuelStation.id.in_(
                select(FuelPrice.station_id)
                .join(FuelType, FuelType.id == FuelPrice.fuel_type_id)
                .where(FuelType.code == fuel_type_code)
            )
        )

    return query


def search(
    db: Session,
    lat: float | None,
    lng: float | None,
    radius_km: float | None,
    city: str | None,
    q: str | None,
    fuel_type_code: str | None,
    offset: int,
    limit: int,
) -> tuple[list[tuple[FuelStation, float | None]], int]:
    """Returns [(station, distance_km_or_None), ...] and the total matching count.
    When lat/lng are given, results are ordered nearest-first via the PostGIS
    geography index and (if radius_km is set) filtered to that radius."""
    base_filter = FuelStation.deleted_at.is_(None) & FuelStation.is_active.is_(True)

    count_query = _apply_filters(select(func.count(FuelStation.id)).where(base_filter), city, q, fuel_type_code)

    if lat is not None and lng is not None:
        origin = func.ST_GeogFromText(_point_wkt(lat, lng))
        if radius_km is not None:
            count_query = count_query.where(geo_func.ST_DWithin(FuelStation.location, origin, radius_km * 1000))
    total = db.scalar(count_query)

    if lat is not None and lng is not None:
        origin = func.ST_GeogFromText(_point_wkt(lat, lng))
        distance_col = (geo_func.ST_Distance(FuelStation.location, origin) / 1000).label("distance_km")

        query = _apply_filters(
            select(FuelStation, distance_col).where(base_filter), city, q, fuel_type_code
        )
        if radius_km is not None:
            query = query.where(geo_func.ST_DWithin(FuelStation.location, origin, radius_km * 1000))
        query = query.order_by(distance_col.asc()).offset(offset).limit(limit)

        rows = db.execute(query).all()
        return [(row[0], row[1]) for row in rows], int(total or 0)

    query = _apply_filters(select(FuelStation).where(base_filter), city, q, fuel_type_code)
    query = query.order_by(FuelStation.name.asc()).offset(offset).limit(limit)
    items = db.scalars(query).all()
    return [(s, None) for s in items], int(total or 0)


def search_along_route(
    db: Session,
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    buffer_km: float,
    limit: int,
) -> list[tuple[FuelStation, float]]:
    """Stations within `buffer_km` of the straight geodesic line between origin and
    destination — genuinely computed via PostGIS (ST_DWithin/ST_Distance against a
    LINESTRING geography), not road-following. Smart Pit Stop labels this honestly as
    a straight-line corridor since no turn-by-turn routing provider is configured."""
    route = func.ST_GeogFromText(_line_wkt(origin_lat, origin_lng, dest_lat, dest_lng))
    distance_col = (geo_func.ST_Distance(FuelStation.location, route) / 1000).label("distance_km")

    query = (
        select(FuelStation, distance_col)
        .where(
            FuelStation.deleted_at.is_(None),
            FuelStation.is_active.is_(True),
            geo_func.ST_DWithin(FuelStation.location, route, buffer_km * 1000),
        )
        .order_by(distance_col.asc())
        .limit(limit)
    )
    rows = db.execute(query).all()
    return [(row[0], row[1]) for row in rows]
