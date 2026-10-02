from pydantic import BaseModel, Field


class PitStopFuelPriceOut(BaseModel):
    fuel_type_code: str
    fuel_type_label: str
    unit: str
    price: float


class PitStopStationOut(BaseModel):
    id: int
    name: str
    brand: str | None
    address: str
    city: str
    latitude: float
    longitude: float
    distance_from_route_km: float
    prices: list[PitStopFuelPriceOut] = []


class PitStopProviderOut(BaseModel):
    id: int
    business_name: str
    address: str
    city: str
    latitude: float
    longitude: float
    distance_from_route_km: float
    verification_status: str


class PitStopSuggestionsOut(BaseModel):
    stations: list[PitStopStationOut]
    providers: list[PitStopProviderOut]
    note: str = Field(
        default=(
            "Distances shown are straight-line proximity to your route, not turn-by-turn "
            "driving directions — GaadiGrid doesn't have a connected routing provider yet."
        )
    )
