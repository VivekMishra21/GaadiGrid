from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.middleware.rbac import get_current_user
from app.models.user import User
from app.repositories import address_repository
from app.schemas.address import AddressCreateIn, AddressOut, AddressUpdateIn
from app.services.exceptions import ForbiddenError, NotFoundError

router = APIRouter(prefix="/api/v1/addresses", tags=["addresses"])


def _get_owned_address(db: Session, address_id: int, user: User):
    address = address_repository.get_by_id(db, address_id)
    if address is None:
        raise NotFoundError("Address not found.")
    if address.user_id != user.id:
        raise ForbiddenError("You do not have access to this address.")
    return address


@router.get("", response_model=list[AddressOut])
def list_my_addresses(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return address_repository.list_by_user(db, user.id)


@router.post("", response_model=AddressOut, status_code=201)
def create_address(payload: AddressCreateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return address_repository.create(db, user.id, payload.model_dump())


@router.put("/{address_id}", response_model=AddressOut)
def update_address(
    address_id: int, payload: AddressUpdateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    address = _get_owned_address(db, address_id, user)
    return address_repository.update(db, address, payload.model_dump(exclude_unset=True))


@router.delete("/{address_id}", status_code=204)
def delete_address(address_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    address = _get_owned_address(db, address_id, user)
    address_repository.delete(db, address)
