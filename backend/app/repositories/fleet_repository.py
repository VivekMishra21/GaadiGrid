from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.fleet_account import FleetAccount, FleetMember, FleetRole


def create_account(db: Session, owner_user_id: int, company_name: str) -> FleetAccount:
    account = FleetAccount(owner_user_id=owner_user_id, company_name=company_name)
    db.add(account)
    db.flush()
    db.add(FleetMember(fleet_account_id=account.id, user_id=owner_user_id, role=FleetRole.OWNER))
    db.commit()
    db.refresh(account)
    return account


def get_by_id(db: Session, fleet_account_id: int) -> FleetAccount | None:
    return db.get(FleetAccount, fleet_account_id)


def get_for_user(db: Session, user_id: int) -> FleetAccount | None:
    """The fleet account this user is a member of, if any — a user belongs to at most
    one fleet account in this foundation (matches how provider staff linking works)."""
    member = db.scalars(select(FleetMember).where(FleetMember.user_id == user_id)).first()
    if member is None:
        return None
    return get_by_id(db, member.fleet_account_id)


def get_membership(db: Session, fleet_account_id: int, user_id: int) -> FleetMember | None:
    return db.scalars(
        select(FleetMember).where(
            FleetMember.fleet_account_id == fleet_account_id, FleetMember.user_id == user_id
        )
    ).first()


def list_members(db: Session, fleet_account_id: int) -> list[FleetMember]:
    return list(db.scalars(select(FleetMember).where(FleetMember.fleet_account_id == fleet_account_id)).all())


def add_member(db: Session, fleet_account_id: int, user_id: int, role: str) -> FleetMember:
    member = FleetMember(fleet_account_id=fleet_account_id, user_id=user_id, role=role)
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


def remove_member(db: Session, member: FleetMember) -> None:
    db.delete(member)
    db.commit()
