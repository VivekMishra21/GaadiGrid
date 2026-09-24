from datetime import date

from sqlalchemy import Date, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class ExpenseCategory:
    FUEL = "FUEL"
    SERVICE = "SERVICE"
    INSURANCE = "INSURANCE"
    PUC = "PUC"
    PARKING = "PARKING"
    FINE = "FINE"
    ACCESSORIES = "ACCESSORIES"
    OTHER = "OTHER"

    ALL = (FUEL, SERVICE, INSURANCE, PUC, PARKING, FINE, ACCESSORIES, OTHER)


class Expense(Base, TimestampMixin):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"), nullable=False, index=True)

    category: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    expense_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
