from decimal import Decimal
from pydantic import BaseModel


class MonthlySummaryItem(BaseModel):
    month: int
    total_income: Decimal
    total_expense: Decimal


class CategorySummaryItem(BaseModel):
    category_id: str
    category_name: str
    icon: str | None = None
    color: str | None = None
    total_amount: Decimal
    percentage: Decimal


class DashboardOverviewResponse(BaseModel):
    total_balance: Decimal
    monthly_income: Decimal
    monthly_expense: Decimal
    transaction_count: int