from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class FacilityCode:
    AIR = "AIR"
    NITROGEN = "NITROGEN"
    WASHROOM = "WASHROOM"
    DRINKING_WATER = "DRINKING_WATER"
    PUC = "PUC"
    ATM = "ATM"
    UPI = "UPI"
    CARD_PAYMENT = "CARD_PAYMENT"
    CONVENIENCE_STORE = "CONVENIENCE_STORE"
    CAR_WASH = "CAR_WASH"
    WHEELCHAIR_ACCESSIBLE = "WHEELCHAIR_ACCESSIBLE"

    ALL = (
        AIR,
        NITROGEN,
        WASHROOM,
        DRINKING_WATER,
        PUC,
        ATM,
        UPI,
        CARD_PAYMENT,
        CONVENIENCE_STORE,
        CAR_WASH,
        WHEELCHAIR_ACCESSIBLE,
    )


class StationFacility(Base, TimestampMixin):
    __tablename__ = "station_facilities"
    __table_args__ = (UniqueConstraint("station_id", "facility_code", name="uq_station_facility"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    station_id: Mapped[int] = mapped_column(ForeignKey("fuel_stations.id"), nullable=False, index=True)
    facility_code: Mapped[str] = mapped_column(String(30), nullable=False)
