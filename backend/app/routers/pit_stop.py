from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.session import get_db
from app.repositories import fuel_price_repository
from app.schemas.pit_stop import PitStopFuelPriceOut, PitStopProviderOut, PitStopStationOut, PitStopSuggestionsOut
from app.services import pit_stop_service

router = APIRouter(prefix="/api/v1/pit-stop", tags=["pit-stop"])


@router.get("/suggestions", response_model=PitStopSuggestionsOut)
def get_pit_stop_suggestions(
    origin_lat: float = Query(ge=-90, le=90),
    origin_lng: float = Query(ge=-180, le=180),
    dest_lat: float = Query(ge=-90, le=90),
    dest_lng: float = Query(ge=-180, le=180),
    buffer_km: float = Query(default=2.0, gt=0, le=10),
    limit: int = Query(default=10, ge=1, le=30),
    db: Session = Depends(get_db),
):
    if not settings.smart_pit_stop_enabled:
        raise HTTPException(status_code=404, detail="Smart Pit Stop is not available yet.")

    station_rows = pit_stop_service.find_stations_along_route(
        db, origin_lat, origin_lng, dest_lat, dest_lng, buffer_km, limit
    )
    station_ids = [s.id for s, _ in station_rows]
    prices_by_station = fuel_price_repository.list_for_stations(db, station_ids)

    stations = [
        PitStopStationOut(
            id=station.id,
            name=station.name,
            brand=station.brand,
            address=station.address,
            city=station.city,
            latitude=station.latitude,
            longitude=station.longitude,
            distance_from_route_km=round(distance_km, 2),
            prices=[
                PitStopFuelPriceOut(fuel_type_code=ft.code, fuel_type_label=ft.label, unit=ft.unit, price=p.price)
                for p, ft in prices_by_station.get(station.id, [])
            ],
        )
        for station, distance_km in station_rows
    ]

    provider_rows = pit_stop_service.find_providers_along_route(
        db, origin_lat, origin_lng, dest_lat, dest_lng, buffer_km, limit
    )
    providers = [
        PitStopProviderOut(
            id=row.provider.id,
            business_name=row.provider.business_name,
            address=row.provider.address,
            city=row.provider.city,
            latitude=row.provider.latitude,
            longitude=row.provider.longitude,
            distance_from_route_km=row.distance_from_route_km,
            verification_status=row.provider.verification_status,
        )
        for row in provider_rows
    ]

    return PitStopSuggestionsOut(stations=stations, providers=providers)
