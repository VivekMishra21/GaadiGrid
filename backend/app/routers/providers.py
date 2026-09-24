from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.constants import Role
from app.core.timezone import IST
from app.database.session import get_db
from app.integrations.weather import get_weather_adapter
from app.middleware.rbac import get_current_user, get_current_user_optional, require_roles
from app.models.provider import Provider
from app.models.service_package import ServicePackage
from app.models.user import User
from app.repositories import (
    provider_availability_repository,
    provider_repository,
    provider_staff_repository,
    review_repository,
    service_package_repository,
    user_repository,
)
from app.schemas.common import PaginatedResponse, paginate
from app.schemas.provider import (
    AvailabilityDayOut,
    AvailabilityUpdateIn,
    ProviderCreateIn,
    ProviderDetailOut,
    ProviderManagerDetailOut,
    ProviderSummaryOut,
    ProviderUpdateIn,
    VerificationSubmitIn,
)
from app.schemas.provider_staff import AddStaffIn, ProviderStaffOut
from app.schemas.review import ReviewOut
from app.schemas.service_package import ServicePackageCreateIn, ServicePackageOut, ServicePackageUpdateIn
from app.schemas.weather import WeatherWarningOut
from app.services import booking_service, provider_verification_service, weather_service
from app.services.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationError

router = APIRouter(prefix="/api/v1/providers", tags=["providers"])


def _is_manager_or_admin(db: Session, user: User | None, provider: Provider) -> bool:
    if user is None:
        return False
    return provider_repository.is_manager(db, provider, user)


def _provider_detail(
    db: Session,
    provider: Provider,
    include_inactive_packages: bool,
    packages: list | None = None,
    rating: tuple[float | None, int] | None = None,
) -> ProviderDetailOut:
    """`packages`/`rating` let a caller building a *page* of these (the admin providers
    list) pass in batch-fetched data instead of triggering a fresh query per provider —
    see `_provider_manager_details_batch` below. A single-provider caller leaves them
    None and this fetches them itself, same as before."""
    if packages is None:
        packages = service_package_repository.list_for_provider(db, provider.id, active_only=not include_inactive_packages)
    summary = ProviderSummaryOut.model_validate(provider)
    summary.average_rating, summary.review_count = rating or review_repository.get_rating_for_provider(db, provider.id)
    return ProviderDetailOut(
        **summary.model_dump(),
        phone=provider.phone,
        email=provider.email,
        packages=[ServicePackageOut.model_validate(p) for p in packages],
    )


def _provider_manager_detail(
    db: Session,
    provider: Provider,
    packages: list | None = None,
    rating: tuple[float | None, int] | None = None,
) -> ProviderManagerDetailOut:
    detail = _provider_detail(db, provider, include_inactive_packages=True, packages=packages, rating=rating)
    return ProviderManagerDetailOut(
        **detail.model_dump(),
        owner_user_id=provider.owner_user_id,
        business_registration_number=provider.business_registration_number,
        gst_number=provider.gst_number,
        verification_notes=provider.verification_notes,
        verification_submitted_at=provider.verification_submitted_at,
        verified_at=provider.verified_at,
    )


def build_provider_manager_details(db: Session, providers: list[Provider]) -> list[ProviderManagerDetailOut]:
    """Batched form of `_provider_manager_detail` for a whole page of providers at
    once (the admin providers list) — one ratings query and one packages query total,
    instead of two per provider."""
    provider_ids = [p.id for p in providers]
    ratings = review_repository.get_ratings_for_providers(db, provider_ids)
    packages_by_provider = service_package_repository.list_for_providers(db, provider_ids)
    return [
        _provider_manager_detail(
            db, p, packages=packages_by_provider.get(p.id, []), rating=ratings.get(p.id, (None, 0))
        )
        for p in providers
    ]


def _get_managed_provider(db: Session, provider_id: int, user: User) -> Provider:
    provider = provider_repository.get_by_id(db, provider_id)
    if provider is None:
        raise NotFoundError("Provider not found.")
    if not _is_manager_or_admin(db, user, provider):
        raise ForbiddenError("You do not manage this provider.")
    return provider


def _get_owner_managed_provider(db: Session, provider_id: int, user: User) -> Provider:
    """Like `_get_managed_provider`, but excludes linked staff — for actions that
    control who has staff access at all (adding/removing staff), a staff account
    shouldn't be able to grant itself the ability to invite or remove other staff."""
    provider = provider_repository.get_by_id(db, provider_id)
    if provider is None:
        raise NotFoundError("Provider not found.")
    is_owner = provider.owner_user_id == user.id
    is_admin = user.role in Role.ADMIN_ROLES
    if not (is_owner or is_admin):
        raise ForbiddenError("Only the business owner can manage staff.")
    return provider


@router.get("", response_model=PaginatedResponse[ProviderSummaryOut])
def search_providers(
    city: str | None = None,
    q: str | None = None,
    category: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * page_size
    items, total = provider_repository.search(db, city, q, category, offset, page_size)
    ratings = review_repository.get_ratings_for_providers(db, [p.id for p in items])

    summaries = []
    for p in items:
        summary = ProviderSummaryOut.model_validate(p)
        summary.average_rating, summary.review_count = ratings.get(p.id, (None, 0))
        summaries.append(summary)

    return paginate(summaries, total, page, page_size)


@router.get("/mine", response_model=ProviderManagerDetailOut | None)
def get_my_provider(db: Session = Depends(get_db), user: User = Depends(require_roles(*Role.PROVIDER_ROLES))):
    provider = provider_repository.get_by_owner_or_staff(db, user.id)
    if provider is None:
        return None
    return _provider_manager_detail(db, provider)


@router.post("", response_model=ProviderManagerDetailOut, status_code=201)
def create_provider(
    payload: ProviderCreateIn, db: Session = Depends(get_db), user: User = Depends(require_roles(Role.PROVIDER_OWNER))
):
    if provider_repository.get_by_owner(db, user.id) is not None:
        raise ConflictError("You already have a business profile.")
    provider = provider_repository.create(db, {**payload.model_dump(), "owner_user_id": user.id})
    return _provider_manager_detail(db, provider)


@router.get("/{provider_id}", response_model=ProviderDetailOut)
def get_provider(provider_id: int, db: Session = Depends(get_db), user: User | None = Depends(get_current_user_optional)):
    provider = provider_repository.get_by_id(db, provider_id)
    if provider is None:
        raise NotFoundError("Provider not found.")
    return _provider_detail(db, provider, include_inactive_packages=_is_manager_or_admin(db, user, provider))


@router.put("/{provider_id}", response_model=ProviderManagerDetailOut)
def update_provider(
    provider_id: int, payload: ProviderUpdateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    provider = _get_managed_provider(db, provider_id, user)
    provider = provider_repository.update(db, provider, payload.model_dump(exclude_unset=True))
    return _provider_manager_detail(db, provider)


@router.post("/{provider_id}/verification/submit", response_model=ProviderManagerDetailOut)
def submit_verification(
    provider_id: int, payload: VerificationSubmitIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    provider = provider_repository.get_by_id(db, provider_id)
    if provider is None:
        raise NotFoundError("Provider not found.")
    if provider.owner_user_id != user.id:
        raise ForbiddenError("Only the business owner can submit for verification.")
    provider = provider_verification_service.submit_verification(
        db, provider, payload.business_registration_number, payload.gst_number
    )
    return _provider_manager_detail(db, provider)


@router.get("/{provider_id}/staff", response_model=list[ProviderStaffOut])
def list_staff(provider_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    provider = _get_managed_provider(db, provider_id, user)
    rows = provider_staff_repository.list_for_provider(db, provider.id)
    return [ProviderStaffOut(user_id=u.id, full_name=u.full_name, email=u.email, added_at=link.created_at) for link, u in rows]


@router.post("/{provider_id}/staff", response_model=ProviderStaffOut, status_code=201)
def add_staff(
    provider_id: int, payload: AddStaffIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    provider = _get_owner_managed_provider(db, provider_id, user)

    staff_user = user_repository.get_by_email(db, payload.email)
    if staff_user is None or staff_user.role != Role.PROVIDER_STAFF:
        raise NotFoundError("No provider-staff account found with that email.")
    if provider_staff_repository.get_provider_id_for_staff(db, staff_user.id) is not None:
        raise ConflictError("That staff member is already linked to a business.")

    link = provider_staff_repository.add(db, provider.id, staff_user.id)
    return ProviderStaffOut(user_id=staff_user.id, full_name=staff_user.full_name, email=staff_user.email, added_at=link.created_at)


@router.delete("/{provider_id}/staff/{user_id}", status_code=204)
def remove_staff(provider_id: int, user_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    provider = _get_owner_managed_provider(db, provider_id, user)
    if not provider_staff_repository.remove(db, provider.id, user_id):
        raise NotFoundError("That user is not on staff for this business.")


@router.get("/{provider_id}/reviews", response_model=PaginatedResponse[ReviewOut])
def list_provider_reviews(
    provider_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    provider = provider_repository.get_by_id(db, provider_id)
    if provider is None:
        raise NotFoundError("Provider not found.")
    offset = (page - 1) * page_size
    items, total = review_repository.list_for_provider(db, provider_id, offset, page_size)
    return paginate([ReviewOut.model_validate(r) for r in items], total, page, page_size)


@router.get("/{provider_id}/weather-warning", response_model=WeatherWarningOut)
def get_weather_warning(provider_id: int, scheduled_at: datetime, db: Session = Depends(get_db)):
    provider = provider_repository.get_by_id(db, provider_id)
    if provider is None:
        raise NotFoundError("Provider not found.")
    if provider.latitude is None or provider.longitude is None:
        return {"warning": None}

    forecast = get_weather_adapter().get_forecast(provider.latitude, provider.longitude, scheduled_at)
    return {"warning": weather_service.get_car_wash_warning(forecast)}


@router.get("/{provider_id}/availability", response_model=list[AvailabilityDayOut])
def get_availability(provider_id: int, db: Session = Depends(get_db)):
    return provider_availability_repository.list_for_provider(db, provider_id)


@router.put("/{provider_id}/availability", response_model=list[AvailabilityDayOut])
def update_availability(
    provider_id: int, payload: AvailabilityUpdateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    _get_managed_provider(db, provider_id, user)
    provider_availability_repository.replace_for_provider(
        db, provider_id, [d.model_dump() for d in payload.days]
    )
    return provider_availability_repository.list_for_provider(db, provider_id)


@router.get("/{provider_id}/packages", response_model=list[ServicePackageOut])
def list_packages(
    provider_id: int, db: Session = Depends(get_db), user: User | None = Depends(get_current_user_optional)
):
    provider = provider_repository.get_by_id(db, provider_id)
    if provider is None:
        raise NotFoundError("Provider not found.")
    active_only = not _is_manager_or_admin(db, user, provider)
    return service_package_repository.list_for_provider(db, provider_id, active_only=active_only)


@router.post("/{provider_id}/packages", response_model=ServicePackageOut, status_code=201)
def create_package(
    provider_id: int, payload: ServicePackageCreateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    _get_managed_provider(db, provider_id, user)
    return service_package_repository.create(db, {**payload.model_dump(), "provider_id": provider_id})


@router.put("/{provider_id}/packages/{package_id}", response_model=ServicePackageOut)
def update_package(
    provider_id: int,
    package_id: int,
    payload: ServicePackageUpdateIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_managed_provider(db, provider_id, user)
    package = service_package_repository.get_by_id(db, package_id)
    if package is None or package.provider_id != provider_id:
        raise NotFoundError("Service package not found.")
    return service_package_repository.update(db, package, payload.model_dump(exclude_unset=True))


@router.get("/{provider_id}/packages/{package_id}/available-slots", response_model=list[datetime])
def get_available_slots(
    provider_id: int,
    package_id: int,
    for_date: date = Query(alias="date"),
    db: Session = Depends(get_db),
):
    provider = provider_repository.get_by_id(db, provider_id)
    if provider is None:
        raise NotFoundError("Provider not found.")
    package: ServicePackage | None = service_package_repository.get_by_id(db, package_id)
    if package is None or package.provider_id != provider_id or not package.is_active:
        raise NotFoundError("Service package not found.")
    if for_date < datetime.now(timezone.utc).astimezone(IST).date():
        raise ValidationError("Cannot fetch slots for a past date.")

    return booking_service.get_available_slots(db, provider, package, for_date, datetime.now(timezone.utc))
