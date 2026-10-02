from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class FleetRole:
    """A fleet account's team member roles — deliberately separate from the
    platform-wide Role constants (CUSTOMER/PROVIDER_*/ADMIN*): fleet membership is a
    permission *within* one fleet account, not a platform role."""

    OWNER = "OWNER"
    MANAGER = "MANAGER"
    DRIVER = "DRIVER"

    ALL = (OWNER, MANAGER, DRIVER)


class FleetAccount(Base, TimestampMixin):
    """Foundation for the Fleet Pro module (cab/delivery operators): a named account
    that groups vehicles and team members together. Deliberately just the data model
    for now — no billing/subscription table yet, since activation stays behind
    `settings.fleet_pro_enabled` until pricing is decided (see docs)."""

    __tablename__ = "fleet_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class FleetMember(Base, TimestampMixin):
    """Grants a user access to a fleet account's vehicles/bookings — separate from
    that user's own personal vehicles, which never get a fleet_account_id."""

    __tablename__ = "fleet_members"
    __table_args__ = (UniqueConstraint("fleet_account_id", "user_id", name="uq_fleet_member"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    fleet_account_id: Mapped[int] = mapped_column(ForeignKey("fleet_accounts.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default=FleetRole.DRIVER)
