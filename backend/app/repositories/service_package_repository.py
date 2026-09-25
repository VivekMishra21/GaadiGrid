from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.service_package import ServicePackage


def list_for_provider(db: Session, provider_id: int, active_only: bool = False) -> list[ServicePackage]:
    query = select(ServicePackage).where(ServicePackage.provider_id == provider_id)
    if active_only:
        query = query.where(ServicePackage.is_active.is_(True))
    query = query.order_by(ServicePackage.category.asc(), ServicePackage.name.asc())
    return list(db.scalars(query).all())


def list_for_providers(db: Session, provider_ids: list[int]) -> dict[int, list[ServicePackage]]:
    """Batched form of `list_for_provider` for building a page of provider details at
    once (e.g. the admin providers list) without one query per provider."""
    if not provider_ids:
        return {}
    rows = db.scalars(
        select(ServicePackage)
        .where(ServicePackage.provider_id.in_(provider_ids))
        .order_by(ServicePackage.category.asc(), ServicePackage.name.asc())
    ).all()
    result: dict[int, list[ServicePackage]] = {pid: [] for pid in provider_ids}
    for package in rows:
        result[package.provider_id].append(package)
    return result


def get_by_id(db: Session, package_id: int) -> ServicePackage | None:
    return db.get(ServicePackage, package_id)


def get_by_ids(db: Session, package_ids: list[int]) -> dict[int, ServicePackage]:
    """Batched form of `get_by_id` for a known set of ids (e.g. building a page of
    booking summaries) — one query instead of one per id."""
    if not package_ids:
        return {}
    rows = db.scalars(select(ServicePackage).where(ServicePackage.id.in_(package_ids))).all()
    return {p.id: p for p in rows}


def create(db: Session, data: dict) -> ServicePackage:
    package = ServicePackage(**data)
    db.add(package)
    db.commit()
    db.refresh(package)
    return package


def update(db: Session, package: ServicePackage, data: dict) -> ServicePackage:
    for field, value in data.items():
        setattr(package, field, value)
    db.commit()
    db.refresh(package)
    return package
