from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.modules.providers.models import Provider
from app.modules.services.models import Service
from app.modules.services.schemas import ServiceCreate, ServiceOut, ServiceUpdate
from app.modules.users.models import User

router = APIRouter(prefix="/api/providers/{provider_id}/services", tags=["services"])


def _get_provider_or_404(db: Session, provider_id: int) -> Provider:
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if provider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")
    return provider


@router.get("", response_model=list[ServiceOut])
def list_services(provider_id: int, db: Session = Depends(get_db)):
    _get_provider_or_404(db, provider_id)
    return db.query(Service).filter(Service.provider_id == provider_id).all()


@router.post("", response_model=ServiceOut, status_code=status.HTTP_201_CREATED)
def create_service(
    provider_id: int,
    payload: ServiceCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    _get_provider_or_404(db, provider_id)
    service = Service(provider_id=provider_id, **payload.model_dump())
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.put("/{service_id}", response_model=ServiceOut)
def update_service(
    provider_id: int,
    service_id: int,
    payload: ServiceUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    service = (
        db.query(Service).filter(Service.id == service_id, Service.provider_id == provider_id).first()
    )
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(service, field, value)

    db.commit()
    db.refresh(service)
    return service


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(
    provider_id: int, service_id: int, db: Session = Depends(get_db), _admin: User = Depends(require_admin)
):
    service = (
        db.query(Service).filter(Service.id == service_id, Service.provider_id == provider_id).first()
    )
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    db.delete(service)
    db.commit()
