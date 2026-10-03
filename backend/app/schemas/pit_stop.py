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


class PitStopNeedPackageOut(BaseModel):
    id: int
    category: str
    name: str
    price: float
    duration_minutes: int
    is_doorstep: bool


class PitStopNeedProviderOut(BaseModel):
    id: int
    business_name: str
    address: str
    city: str
    locality: str | None
    latitude: float
    longitude: float
    distance_km: float
    is_sponsored: bool
    verification_status: str
    average_rating: float | None
    review_count: int
    packages: list[PitStopNeedPackageOut]


class PitStopNeedOut(BaseModel):
    need: str
    radius_km: float
    providers: list[PitStopNeedProviderOut]
    note: str = Field(
        default=(
            "Straight-line distance from the location you gave, for services partners currently "
            "list on GaadiGrid. This is not a diagnosis of your vehicle."
        )
    )
