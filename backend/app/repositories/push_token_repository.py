from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.push_token import PushToken


def register(db: Session, user_id: int, token: str, platform: str) -> PushToken:
    stmt = (
        pg_insert(PushToken)
        .values(user_id=user_id, token=token, platform=platform)
        .on_conflict_do_update(
            index_elements=[PushToken.user_id, PushToken.token],
            set_={"platform": platform},
        )
        .returning(PushToken)
    )
    row = db.execute(stmt).scalar_one()
    db.commit()
    return row


def unregister(db: Session, user_id: int, token: str) -> None:
    db.execute(sa_delete(PushToken).where(PushToken.user_id == user_id, PushToken.token == token))
    db.commit()


def list_for_user(db: Session, user_id: int) -> list[PushToken]:
    return list(db.scalars(select(PushToken).where(PushToken.user_id == user_id)).all())
