from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.address import Address


def list_by_user(db: Session, user_id: int) -> list[Address]:
    return list(
        db.scalars(
            select(Address).where(Address.user_id == user_id).order_by(Address.is_default.desc(), Address.created_at.asc())
        ).all()
    )


def get_by_id(db: Session, address_id: int) -> Address | None:
    return db.get(Address, address_id)


def _clear_other_defaults(db: Session, user_id: int, except_id: int | None = None) -> None:
    query = db.query(Address).filter(Address.user_id == user_id, Address.is_default.is_(True))
    if except_id is not None:
        query = query.filter(Address.id != except_id)
    query.update({"is_default": False})


def create(db: Session, user_id: int, data: dict) -> Address:
    existing_count = db.query(Address).filter(Address.user_id == user_id).count()
    is_default = data.get("is_default", False) or existing_count == 0

    address = Address(user_id=user_id, **{**data, "is_default": is_default})
    db.add(address)
    db.flush()

    if is_default:
        _clear_other_defaults(db, user_id, except_id=address.id)

    db.commit()
    db.refresh(address)
    return address


def update(db: Session, address: Address, data: dict) -> Address:
    for field, value in data.items():
        setattr(address, field, value)

    if data.get("is_default"):
        _clear_other_defaults(db, address.user_id, except_id=address.id)

    db.commit()
    db.refresh(address)
    return address


def delete(db: Session, address: Address) -> None:
    was_default = address.is_default
    user_id = address.user_id
    db.delete(address)
    db.flush()

    if was_default:
        next_address = db.scalars(
            select(Address).where(Address.user_id == user_id).order_by(Address.created_at.asc())
        ).first()
        if next_address is not None:
            next_address.is_default = True

    db.commit()
