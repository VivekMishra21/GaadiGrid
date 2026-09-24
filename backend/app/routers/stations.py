from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.constants import Role
from app.database.session import get_db
from app.middleware.rbac import get_current_user, get_current_user_optional, require_roles
from app.models.fuel_station import FuelStation
from app.models.fuel_type import FuelType
from app.models.user import User
from app.repositories import (
    favorite_station_repository,
    fuel_availability_repository,
    fuel_price_repository,
    fuel_type_repository,
    station_facility_repository,
    station_repository,
)
from app.schemas.common import PaginatedResponse, paginate
from app.schemas.fuel_price import FuelAvailabilityOut, FuelAvailabilityUpsertIn, FuelPriceOut, FuelPriceUpsertIn
from app.schemas.fuel_type import FuelTypeOut
from app.schemas.station import FacilitiesUpdateIn, StationCreateIn, StationDetailOut, StationSummaryOut, StationUpdateIn
from app.services.audit_service import record_audit_event
from app.services.exceptions import NotFoundError, ValidationError
from app.services.queue_status_service import get_station_queue_status

router = APIRouter(prefix="/api/v1/stations", tags=["stations"])
fuel_types_router = APIRouter(prefix="/api/v1/fuel-types", tags=["fuel-types"])


def _price_to_out(price, fuel_type: FuelType, now_minutes_fn) -> FuelPriceOut:
    return FuelPriceOut(
        fuel_type_code=fuel_type.code,
        fuel_type_label=fuel_type.label,
        unit=fuel_type.unit,
        price=price.price,
        updated_at=price.updated_at,
        age_minutes=now_minutes_fn(price.updated_at),
    )


def _minutes_ago(dt) -> int:
    aware = dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)
    return max(0, int((datetime.now(timezone.utc) - aware).total_seconds() / 60))


def _build_summary(
    db: Session,
    station: FuelStation,
    distance_km: float | None,
    prices_by_station: dict,
    favorite_ids: set[int],
) -> StationSummaryOut:
    prices = [_price_to_out(p, ft, _minutes_ago) for p, ft in prices_by_station.get(station.id, [])]
    queue_status = get_station_queue_status(db, station.id)

    return StationSummaryOut(
        id=station.id,
        name=station.name,
        brand=station.brand,
        address=station.address,
        city=station.city,
        locality=station.locality,
        latitude=station.latitude,
        longitude=station.longitude,
        is_24_hours=station.is_24_hours,
        opens_at=station.opens_at,
        closes_at=station.closes_at,
        distance_km=round(distance_km, 2) if distance_km is not None else None,
        is_favorite=station.id in favorite_ids,
        prices=prices,
        queue_status=queue_status,
    )


@router.get("", response_model=PaginatedResponse[StationSummaryOut])
def search_stations(
    lat: float | None = Query(default=None, ge=-90, le=90),
    lng: float | None = Query(default=None, ge=-180, le=180),
    radius_km: float | None = Query(default=None, gt=0),
    city: str | None = None,
    q: str | None = None,
    fuel_type: str | None = Query(default=None, description="Fuel type code, e.g. PETROL"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    if (lat is None) != (lng is None):
        raise ValidationError("Both lat and lng are required together.")

    effective_radius = radius_km
    if lat is not None and effective_radius is None:
        effective_radius = settings.default_station_search_radius_km
    if effective_radius is not None and effective_radius > settings.max_station_search_radius_km:
        effective_radius = settings.max_station_search_radius_km

    offset = (page - 1) * page_size
    results, total = station_repository.search(db, lat, lng, effective_radius, city, q, fuel_type, offset, page_size)

    station_ids = [s.id for s, _ in results]
    prices_by_station = fuel_price_repository.list_for_stations(db, station_ids)
    favorite_ids = favorite_station_repository.list_station_ids_for_user(db, user.id) if user else set()

    items = [_build_summary(db, s, dist, prices_by_station, favorite_ids) for s, dist in results]
    return paginate(items, total, page, page_size)


@router.get("/favorites/mine", response_model=list[StationSummaryOut])
def list_my_favorites(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    station_ids = favorite_station_repository.list_station_ids_for_user(db, user.id)
    if not station_ids:
        return []

    stations = station_repository.list_by_ids(db, station_ids)
    prices_by_station = fuel_price_repository.list_for_stations(db, [s.id for s in stations])

    return [_build_summary(db, s, None, prices_by_station, station_ids) for s in stations]


@router.get("/{station_id}", response_model=StationDetailOut)
def get_station(station_id: int, db: Session = Depends(get_db), user: User | None = Depends(get_current_user_optional)):
    station = station_repository.get_by_id(db, station_id)
    if station is None:
        raise NotFoundError("Station not found.")

    prices_by_station = fuel_price_repository.list_for_stations(db, [station_id])
    favorite_ids = favorite_station_repository.list_station_ids_for_user(db, user.id) if user else set()
    summary = _build_summary(db, station, None, prices_by_station, favorite_ids)

    availability = [
        FuelAvailabilityOut(
            fuel_type_code=ft.code, fuel_type_label=ft.label, is_available=a.is_available, note=a.note, updated_at=a.updated_at
        )
        for a, ft in fuel_availability_repository.list_for_station(db, station_id)
    ]
    facilities = station_facility_repository.list_codes_for_station(db, station_id)

    return StationDetailOut(**summary.model_dump(), availability=availability, facilities=facilities, created_at=station.created_at)


@router.post("", response_model=StationDetailOut, status_code=201)
def create_station(payload: StationCreateIn, db: Session = Depends(get_db), _admin: User = Depends(require_roles(*Role.ADMIN_ROLES))):
    station = station_repository.create(db, payload.model_dump())
    record_audit_event(db, action="station.create", actor_user_id=_admin.id, target_type="station", target_id=str(station.id))
    return get_station(station.id, db, None)


@router.put("/{station_id}", response_model=StationDetailOut)
def update_station(
    station_id: int,
    payload: StationUpdateIn,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(*Role.ADMIN_ROLES)),
):
    station = station_repository.get_by_id(db, station_id)
    if station is None:
        raise NotFoundError("Station not found.")
    station_repository.update(db, station, payload.model_dump(exclude_unset=True))
    record_audit_event(db, action="station.update", actor_user_id=_admin.id, target_type="station", target_id=str(station_id))
    return get_station(station_id, db, None)


@router.delete("/{station_id}", status_code=204)
def delete_station(station_id: int, db: Session = Depends(get_db), _admin: User = Depends(require_roles(*Role.ADMIN_ROLES))):
    station = station_repository.get_by_id(db, station_id)
    if station is None:
        raise NotFoundError("Station not found.")
    station.deleted_at = datetime.now(timezone.utc)
    station.is_active = False
    db.commit()
    record_audit_event(db, action="station.delete", actor_user_id=_admin.id, target_type="station", target_id=str(station_id))


@router.put("/{station_id}/prices", response_model=list[FuelPriceOut])
def upsert_prices(
    station_id: int,
    payload: FuelPriceUpsertIn,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(*Role.ADMIN_ROLES)),
):
    station = station_repository.get_by_id(db, station_id)
    if station is None:
        raise NotFoundError("Station not found.")

    for item in payload.prices:
        fuel_type = fuel_type_repository.get_by_code(db, item.fuel_type_code)
        if fuel_type is None:
            raise ValidationError(f"Unknown fuel type code: {item.fuel_type_code}")
        fuel_price_repository.upsert(db, station_id, fuel_type.id, item.price)

    record_audit_event(db, action="station.prices.update", actor_user_id=_admin.id, target_type="station", target_id=str(station_id))
    return [_price_to_out(p, ft, _minutes_ago) for p, ft in fuel_price_repository.list_for_station(db, station_id)]


@router.put("/{station_id}/availability", response_model=list[FuelAvailabilityOut])
def upsert_availability(
    station_id: int,
    payload: FuelAvailabilityUpsertIn,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(*Role.ADMIN_ROLES)),
):
    station = station_repository.get_by_id(db, station_id)
    if station is None:
        raise NotFoundError("Station not found.")

    for item in payload.availability:
        fuel_type = fuel_type_repository.get_by_code(db, item.fuel_type_code)
        if fuel_type is None:
            raise ValidationError(f"Unknown fuel type code: {item.fuel_type_code}")
        fuel_availability_repository.upsert(db, station_id, fuel_type.id, item.is_available, item.note)

    record_audit_event(db, action="station.availability.update", actor_user_id=_admin.id, target_type="station", target_id=str(station_id))
    return [
        FuelAvailabilityOut(fuel_type_code=ft.code, fuel_type_label=ft.label, is_available=a.is_available, note=a.note, updated_at=a.updated_at)
        for a, ft in fuel_availability_repository.list_for_station(db, station_id)
    ]


@router.put("/{station_id}/facilities", response_model=list[str])
def update_facilities(
    station_id: int,
    payload: FacilitiesUpdateIn,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(*Role.ADMIN_ROLES)),
):
    station = station_repository.get_by_id(db, station_id)
    if station is None:
        raise NotFoundError("Station not found.")

    station_facility_repository.replace_for_station(db, station_id, payload.facility_codes)
    record_audit_event(db, action="station.facilities.update", actor_user_id=_admin.id, target_type="station", target_id=str(station_id))
    return station_facility_repository.list_codes_for_station(db, station_id)


@router.post("/{station_id}/favorite")
def toggle_favorite(station_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    station = station_repository.get_by_id(db, station_id)
    if station is None:
        raise NotFoundError("Station not found.")

    is_favorite = favorite_station_repository.toggle(db, user.id, station_id)
    return {"station_id": station_id, "is_favorite": is_favorite}


@fuel_types_router.get("", response_model=list[FuelTypeOut])
def list_fuel_types(db: Session = Depends(get_db)):
    return fuel_type_repository.list_all(db)
