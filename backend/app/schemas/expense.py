from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.expense import ExpenseCategory


class ExpenseBase(BaseModel):
    category: str
    amount: float = Field(gt=0, le=10_000_000)
    expense_date: date
    note: str | None = Field(default=None, max_length=500)

    @field_validator("category")
    @classmethod
    def check_category(cls, v: str) -> str:
        if v not in ExpenseCategory.ALL:
            raise ValueError(f"category must be one of {ExpenseCategory.ALL}")
        return v


class ExpenseCreateIn(ExpenseBase):
    pass


class ExpenseUpdateIn(BaseModel):
    category: str | None = None
    amount: float | None = Field(default=None, gt=0, le=10_000_000)
    expense_date: date | None = None
    note: str | None = Field(default=None, max_length=500)

    @field_validator("category")
    @classmethod
    def check_category(cls, v: str | None) -> str | None:
        if v is not None and v not in ExpenseCategory.ALL:
            raise ValueError(f"category must be one of {ExpenseCategory.ALL}")
        return v


class ExpenseOut(ExpenseBase):
    id: int
    owner_id: int
    vehicle_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExpenseSummaryOut(BaseModel):
    total: float
    by_category: dict[str, float]
