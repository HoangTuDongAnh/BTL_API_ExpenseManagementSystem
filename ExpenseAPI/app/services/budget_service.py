from datetime import datetime

from sqlalchemy.orm import Session

from app.models.budget import Budget
from app.models.category import Category
from app.repositories.budget_repo import BudgetRepository
from app.schemas.budget_schema import BudgetCreateRequest, BudgetUpdateRequest


class BudgetService:
    def __init__(self):
        self.budget_repo = BudgetRepository()

    def _generate_budget_id(self, db: Session) -> str:
        month_part = datetime.now().strftime("%y%m")
        prefix = f"BUD{month_part}"

        last_budget = (
            db.query(Budget)
            .filter(Budget.BudgetID.like(f"{prefix}%"))
            .order_by(Budget.BudgetID.desc())
            .first()
        )

        if last_budget:
            last_seq = int(last_budget.BudgetID[-4:])
        else:
            last_seq = 0

        new_seq = last_seq + 1
        return f"{prefix}{new_seq:04d}"

    def get_budgets(self, db: Session, user_id: str):
        return self.budget_repo.get_all_by_user(db, user_id)

    def create_budget(self, db: Session, user_id: str, data: BudgetCreateRequest):
        category = (
            db.query(Category)
            .filter(
                Category.CategoryID == data.category_id,
                ((Category.UserID == user_id) | (Category.UserID.is_(None)))
            )
            .first()
        )
        if not category:
            raise ValueError("Category not found")

        existing_budget = self.budget_repo.get_existing(
            db, user_id, data.category_id, data.period_month, data.period_year
        )
        if existing_budget:
            raise ValueError("Budget already exists for this category and month")

        budget = Budget(
            BudgetID=self._generate_budget_id(db),
            UserID=user_id,
            CategoryID=data.category_id,
            LimitAmount=data.limit_amount,
            SpentAmount=0,
            PeriodMonth=data.period_month,
            PeriodYear=data.period_year,
        )

        return self.budget_repo.create(db, budget)

    def update_budget(self, db: Session, budget_id: str, user_id: str, data: BudgetUpdateRequest):
        budget = self.budget_repo.get_by_id_and_user(db, budget_id, user_id)
        if not budget:
            raise ValueError("Budget not found")

        if data.limit_amount is not None:
            budget.LimitAmount = data.limit_amount

        budget.UpdatedAt = datetime.now()
        db.commit()
        db.refresh(budget)
        return budget

    def delete_budget(self, db: Session, budget_id: str, user_id: str):
        budget = self.budget_repo.get_by_id_and_user(db, budget_id, user_id)
        if not budget:
            raise ValueError("Budget not found")

        self.budget_repo.delete(db, budget)