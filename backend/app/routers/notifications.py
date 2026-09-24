from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.middleware.rbac import get_current_user
from app.models.user import User
from app.repositories import notification_repository, push_token_repository
from app.schemas.common import PaginatedResponse, paginate
from app.schemas.notification import (
    NotificationOut,
    PushTokenRegisterIn,
    PushTokenUnregisterIn,
    UnreadCountOut,
)
from app.services.exceptions import ForbiddenError, NotFoundError

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.post("/push-token", status_code=204)
def register_push_token(payload: PushTokenRegisterIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    push_token_repository.register(db, user.id, payload.token, payload.platform)


@router.delete("/push-token", status_code=204)
def unregister_push_token(
    payload: PushTokenUnregisterIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    push_token_repository.unregister(db, user.id, payload.token)


@router.get("", response_model=PaginatedResponse[NotificationOut])
def list_notifications(
    unread_only: bool = False,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    offset = (page - 1) * page_size
    items, total = notification_repository.list_for_user(db, user.id, unread_only, offset, page_size)
    return paginate([NotificationOut.model_validate(n) for n in items], total, page, page_size)


@router.get("/unread-count", response_model=UnreadCountOut)
def get_unread_count(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return {"unread_count": notification_repository.unread_count(db, user.id)}


@router.post("/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(notification_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    notification = notification_repository.get_by_id(db, notification_id)
    if notification is None:
        raise NotFoundError("Notification not found.")
    if notification.user_id != user.id:
        raise ForbiddenError("You do not have access to this notification.")
    return notification_repository.mark_read(db, notification)


@router.post("/read-all", status_code=204)
def mark_all_notifications_read(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    notification_repository.mark_all_read(db, user.id)
