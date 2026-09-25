from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.constants import Role
from app.models.provider import Provider, VerificationStatus
from app.models.service_package import ServiceCategory, ServicePackage
from app.models.user import User
from app.repositories import provider_staff_repository


def create(db: Session, data: dict) -> Provider:
    provider = Provider(**data)
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return provider


def update(db: Session, provider: Provider, data: dict) -> Provider:
    for field, value in data.items():
        setattr(provider, field, value)
    db.commit()
    db.refresh(provider)
    return provider


def get_by_id(db: Session, provider_id: int) -> Provider | None:
    provider = db.get(Provider, provider_id)
    if provider is not None and provider.deleted_at is not None:
        return None
    return provider


def get_by_ids(db: Session, provider_ids: list[int]) -> dict[int, Provider]:
    """Batched form of `get_by_id` for a known set of ids (e.g. building a page of
    booking summaries) — one query instead of one per id."""
    if not provider_ids:
        return {}
    rows = db.scalars(
        select(Provider).where(Provider.id.in_(provider_ids), Provider.deleted_at.is_(None))
    ).all()
    return {p.id: p for p in rows}


def get_by_owner(db: Session, owner_user_id: int) -> Provider | None:
    return db.scalars(
        select(Provider).where(Provider.owner_user_id == owner_user_id, Provider.deleted_at.is_(None))
    ).first()


def get_by_owner_or_staff(db: Session, user_id: int) -> Provider | None:
    """The provider a PROVIDER_OWNER or PROVIDER_STAFF user is linked to, whichever
    applies — a user is never both, since staff and ownership are mutually exclusive
    roles in practice, but this checks ownership first regardless."""
    owner_provider = get_by_owner(db, user_id)
    if owner_provider is not None:
        return owner_provider

    staff_provider_id = provider_staff_repository.get_provider_id_for_staff(db, user_id)
    if staff_provider_id is None:
        return None
    return get_by_id(db, staff_provider_id)


def is_manager(db: Session, provider: Provider, user: User) -> bool:
    """True if `user` may manage `provider`'s business: its owner, a linked staff
    member, or an admin."""
    if user.role in Role.ADMIN_ROLES:
        return True
    if provider.owner_user_id == user.id:
        return True
    return provider_staff_repository.is_staff_of(db, provider.id, user.id)


def search(
    db: Session,
    city: str | None,
    q: str | None,
    category: str | None,
    offset: int,
    limit: int,
) -> tuple[list[Provider], int]:
    base_filter = Provider.deleted_at.is_(None) & Provider.is_active.is_(True)

    def apply_filters(query):
        if city:
            query = query.where(func.lower(Provider.city) == city.lower())
        if q:
            like = f"%{q}%"
            query = query.where(
                (Provider.business_name.ilike(like)) | (Provider.locality.ilike(like)) | (Provider.address.ilike(like))
            )
        if category and category in ServiceCategory.ALL:
            query = query.where(
                Provider.id.in_(
                    select(ServicePackage.provider_id).where(
                        ServicePackage.category == category, ServicePackage.is_active.is_(True)
                    )
                )
            )
        return query

    total = db.scalar(apply_filters(select(func.count(Provider.id)).where(base_filter)))

    query = apply_filters(select(Provider).where(base_filter)).order_by(Provider.business_name.asc()).offset(offset).limit(limit)
    items = db.scalars(query).all()

    return list(items), int(total or 0)


def list_all_for_admin(
    db: Session, verification_status: str | None, q: str | None, offset: int, limit: int
) -> tuple[list[Provider], int]:
    """Unlike search(), this includes inactive and unverified providers — it's for
    the admin moderation view, not customer-facing discovery."""
    base_filter = Provider.deleted_at.is_(None)

    def apply_filters(query):
        if verification_status and verification_status in VerificationStatus.ALL:
            query = query.where(Provider.verification_status == verification_status)
        if q:
            like = f"%{q}%"
            query = query.where((Provider.business_name.ilike(like)) | (Provider.city.ilike(like)))
        return query

    total = db.scalar(apply_filters(select(func.count(Provider.id)).where(base_filter)))
    query = (
        apply_filters(select(Provider).where(base_filter))
        .order_by(Provider.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    items = db.scalars(query).all()
    return list(items), int(total or 0)
