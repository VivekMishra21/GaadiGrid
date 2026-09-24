from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.constants import Role
from app.models.user import User


def get_by_id(db: Session, user_id: int) -> User | None:
    user = db.get(User, user_id)
    if user is not None and user.deleted_at is not None:
        return None
    return user


def get_by_phone(db: Session, phone: str) -> User | None:
    return db.scalars(select(User).where(User.phone == phone, User.deleted_at.is_(None))).first()


def get_by_email(db: Session, email: str) -> User | None:
    return db.scalars(select(User).where(User.email == email, User.deleted_at.is_(None))).first()


def create_customer(db: Session, phone: str, full_name: str) -> User:
    user = User(phone=phone, full_name=full_name, role=Role.CUSTOMER)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_staff_user(db: Session, email: str, password_hash: str, full_name: str, role: str) -> User:
    user = User(email=email, password_hash=password_hash, full_name=full_name, role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def list_all(
    db: Session, offset: int, limit: int, role: str | None = None, q: str | None = None, is_active: bool | None = None
) -> tuple[list[User], int]:
    def apply_filters(query):
        query = query.where(User.deleted_at.is_(None))
        if role:
            query = query.where(User.role == role)
        if is_active is not None:
            query = query.where(User.is_active.is_(is_active))
        if q:
            like = f"%{q}%"
            query = query.where((User.full_name.ilike(like)) | (User.email.ilike(like)) | (User.phone.ilike(like)))
        return query

    items = db.scalars(
        apply_filters(select(User)).order_by(User.created_at.desc()).offset(offset).limit(limit)
    ).all()
    total_count = db.scalar(apply_filters(select(func.count()).select_from(User)))
    return list(items), int(total_count or 0)


def set_active(db: Session, user: User, is_active: bool) -> User:
    user.is_active = is_active
    db.commit()
    db.refresh(user)
    return user
