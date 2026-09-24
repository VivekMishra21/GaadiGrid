from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.middleware.rbac import get_current_user
from app.models.user import User
from app.repositories import user_repository
from app.schemas.auth import UserOut
from app.schemas.user import UserProfileUpdateIn
from app.services.exceptions import ConflictError

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def get_my_profile(user: User = Depends(get_current_user)):
    return user


@router.put("/me", response_model=UserOut)
def update_my_profile(payload: UserProfileUpdateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if payload.email and payload.email != user.email:
        existing = user_repository.get_by_email(db, payload.email)
        if existing is not None and existing.id != user.id:
            raise ConflictError("This email is already in use.")
        user.email = payload.email

    if payload.full_name:
        user.full_name = payload.full_name

    db.commit()
    db.refresh(user)
    return user
