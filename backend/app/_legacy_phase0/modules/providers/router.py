from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.modules.providers.models import Provider
from app.modules.providers.schemas import ProviderCreate, ProviderOut, ProviderUpdate
from app.modules.services.models import Service
from app.modules.users.models import User

router = APIRouter(prefix="/api/providers", tags=["providers"])


def _attach_services(db: Session, provider: Provider) -> Provider:
    provider.services = db.query(Service).filter(Service.provider_id == provider.id).all()
    return provider


@router.get("", response_model=list[ProviderOut])
def list_providers(station_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(Provider).filter(Provider.is_active.is_(True))
    if station_id is not None:
        query = query.filter(Provider.station_id == station_id)
    providers = query.order_by(Provider.name).all()
    return [_attach_services(db, p) for p in providers]


@router.get("/{provider_id}", response_model=ProviderOut)
def get_provider(provider_id: int, db: Session = Depends(get_db)):
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if provider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")
    return _attach_services(db, provider)


@router.post("", response_model=ProviderOut, status_code=status.HTTP_201_CREATED)
def create_provider(payload: ProviderCreate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    provider = Provider(**payload.model_dump())
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return _attach_services(db, provider)


@router.put("/{provider_id}", response_model=ProviderOut)
def update_provider(
    provider_id: int, payload: ProviderUpdate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)
):
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if provider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(provider, field, value)

    db.commit()
    db.refresh(provider)
    return _attach_services(db, provider)


@router.delete("/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_provider(provider_id: int, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if provider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")
    db.delete(provider)
    db.commit()
