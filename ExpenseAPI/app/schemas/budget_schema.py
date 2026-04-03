from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class BudgetCreateRequest(BaseModel):
    category_id: str = Field(..., min_length=1, max_length=15)
    limit_amount: Decimal = Field(..., gt=0)
    period_month: int = Field(..., ge=1, le=12)
    period_year: int = Field(..., ge=2000, le=2100)


class BudgetUpdateRequest(BaseModel):
    limit_amount: Decimal | None = Field(default=None, gt=0)


class BudgetResponse(BaseModel):
    budget_id: str
    user_id: str
    category_id: str
    limit_amount: Decimal
    spent_amount: Decimal
    period_month: int
    period_year: int

    model_config = ConfigDict(from_attributes=True)