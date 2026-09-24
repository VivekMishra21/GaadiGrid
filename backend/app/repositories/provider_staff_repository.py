from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.provider_staff_member import ProviderStaffMember
from app.models.user import User


def is_staff_of(db: Session, provider_id: int, user_id: int) -> bool:
    return (
        db.scalars(
            select(ProviderStaffMember).where(
                ProviderStaffMember.provider_id == provider_id, ProviderStaffMember.user_id == user_id
            )
        ).first()
        is not None
    )


def get_provider_id_for_staff(db: Session, user_id: int) -> int | None:
    link = db.scalars(select(ProviderStaffMember).where(ProviderStaffMember.user_id == user_id)).first()
    return link.provider_id if link else None


def list_for_provider(db: Session, provider_id: int) -> list[tuple[ProviderStaffMember, User]]:
    rows = db.execute(
        select(ProviderStaffMember, User)
        .join(User, User.id == ProviderStaffMember.user_id)
        .where(ProviderStaffMember.provider_id == provider_id)
        .order_by(ProviderStaffMember.created_at.asc())
    ).all()
    return [(row[0], row[1]) for row in rows]


def add(db: Session, provider_id: int, user_id: int) -> ProviderStaffMember:
    link = ProviderStaffMember(provider_id=provider_id, user_id=user_id)
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


def remove(db: Session, provider_id: int, user_id: int) -> bool:
    link = db.scalars(
        select(ProviderStaffMember).where(
            ProviderStaffMember.provider_id == provider_id, ProviderStaffMember.user_id == user_id
        )
    ).first()
    if link is None:
        return False
    db.delete(link)
    db.commit()
    return True
