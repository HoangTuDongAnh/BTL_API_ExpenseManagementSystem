from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction
from app.repositories.category_repo import CategoryRepository
from app.schemas.category_schema import (
    CategoryBudgetSummary,
    CategoryCreateRequest,
    CategoryDeleteRequest,
    CategoryOverviewResponse,
    CategoryResponse,
    CategoryUpdateRequest,
)
from app.utils.budget_period import calculate_budget_metrics, normalize_period


class CategoryService:
    def __init__(self):
        self.category_repo = CategoryRepository()

    def _generate_category_id(self, db: Session) -> str:
        date_part = datetime.now().strftime("%y%m%d")
        prefix = f"CAT{date_part}"

        last_category = (
            db.query(Category)
            .filter(Category.CategoryID.like(f"{prefix}%"))
            .order_by(Category.CategoryID.desc())
            .first()
        )

        last_seq = int(last_category.CategoryID[-3:]) if last_category else 0
        new_seq = last_seq + 1
        return f"{prefix}{new_seq:03d}"

    def get_categories(self, db: Session, user_id: str):
        return self.category_repo.get_all_by_user(db, user_id)

    def get_categories_response(self, db: Session, user_id: str) -> list[CategoryResponse]:
        categories = self.get_categories(db, user_id)
        return [
            CategoryResponse(
                category_id=c.CategoryID,
                user_id=c.UserID,
                category_name=c.CategoryName,
                icon=c.Icon,
                color=c.Color,
                is_default=c.IsDefault,
            )
            for c in categories
        ]

    def get_categories_overview(
        self,
        db: Session,
        user_id: str,
        period_type: str,
        period_year: int,
        period_month: int | None = None,
        period_week: int | None = None,
    ) -> list[CategoryOverviewResponse]:
        period = normalize_period(
            period_type=period_type,
            period_year=period_year,
            period_month=period_month,
            period_week=period_week,
        )

        categories = self.category_repo.get_all_by_user(db, user_id)
        budgets = (
            db.query(Budget)
            .filter(
                Budget.UserID == user_id,
                Budget.PeriodType == period["period_type"],
                Budget.PeriodYear == period["period_year"],
                Budget.PeriodMonth == period["period_month"],
                Budget.PeriodWeek == period["period_week"],
            )
            .all()
        )

        budget_map = {b.CategoryID: b for b in budgets}
        result: list[CategoryOverviewResponse] = []

        for c in categories:
            budget = budget_map.get(c.CategoryID)

            if budget:
                metrics = calculate_budget_metrics(budget.LimitAmount, budget.SpentAmount)
                budget_summary = CategoryBudgetSummary(
                    budget_id=budget.BudgetID,
                    limit_amount=budget.LimitAmount,
                    spent_amount=budget.SpentAmount,
                    remaining_amount=Decimal(str(metrics["remaining_amount"])),
                    percentage_used=metrics["percentage_used"],
                    status=metrics["status"],
                    period_type=budget.PeriodType,
                    period_year=budget.PeriodYear,
                    period_month=budget.PeriodMonth,
                    period_week=budget.PeriodWeek,
                    start_date=budget.StartDate,
                    end_date=budget.EndDate,
                )
            else:
                budget_summary = CategoryBudgetSummary(
                    status="none",
                    period_type=period["period_type"],
                    period_year=period["period_year"],
                    period_month=period["period_month"],
                    period_week=period["period_week"],
                    start_date=period["start_date"],
                    end_date=period["end_date"],
                )

            result.append(
                CategoryOverviewResponse(
                    category_id=c.CategoryID,
                    user_id=c.UserID,
                    category_name=c.CategoryName,
                    icon=c.Icon,
                    color=c.Color,
                    is_default=c.IsDefault,
                    can_edit=(c.UserID == user_id),
                    can_delete=(c.UserID == user_id),
                    budget=budget_summary,
                )
            )

        return result

    def create_category(self, db: Session, user_id: str, data: CategoryCreateRequest):
        existing_category = self.category_repo.get_by_name_and_user(db, data.category_name, user_id)
        if existing_category:
            raise ValueError("Category name already exists")

        category = Category(
            CategoryID=self._generate_category_id(db),
            UserID=user_id,
            CategoryName=data.category_name,
            Icon=data.icon,
            Color=data.color,
            IsDefault=False,
        )

        return self.category_repo.create(db, category)

    def update_category(self, db: Session, category_id: str, user_id: str, data: CategoryUpdateRequest):
        category = self.category_repo.get_custom_by_id_and_user(db, category_id, user_id)
        if not category:
            raise ValueError("Category not found or cannot edit default category")

        if data.category_name and data.category_name != category.CategoryName:
            duplicate = self.category_repo.get_by_name_and_user(db, data.category_name, user_id)
            if duplicate:
                raise ValueError("Category name already exists")
            category.CategoryName = data.category_name

        if data.icon is not None:
            category.Icon = data.icon

        if data.color is not None:
            category.Color = data.color

        category.UpdatedAt = datetime.now()
        db.commit()
        db.refresh(category)
        return category

    def delete_category(self, db: Session, category_id: str, user_id: str, data: CategoryDeleteRequest):
        category = self.category_repo.get_custom_by_id_and_user(db, category_id, user_id)
        if not category:
            raise ValueError("Category not found or cannot delete default category")

        if data.replacement_category_id == category_id:
            raise ValueError("Replacement category must be different")

        replacement_category = (
            db.query(Category)
            .filter(
                Category.CategoryID == data.replacement_category_id,
                ((Category.UserID == user_id) | (Category.UserID.is_(None)))
            )
            .first()
        )
        if not replacement_category:
            raise ValueError("Replacement category not found")

        transactions = (
            db.query(Transaction)
            .filter(Transaction.CategoryID == category_id, Transaction.UserID == user_id)
            .all()
        )
        for t in transactions:
            t.CategoryID = replacement_category.CategoryID
            t.UpdatedAt = datetime.now()

        budgets = (
            db.query(Budget)
            .filter(Budget.CategoryID == category_id, Budget.UserID == user_id)
            .all()
        )

        for old_budget in budgets:
            existing_budget = (
                db.query(Budget)
                .filter(
                    Budget.UserID == user_id,
                    Budget.CategoryID == replacement_category.CategoryID,
                    Budget.PeriodType == old_budget.PeriodType,
                    Budget.PeriodYear == old_budget.PeriodYear,
                    Budget.PeriodMonth == old_budget.PeriodMonth,
                    Budget.PeriodWeek == old_budget.PeriodWeek,
                )
                .first()
            )

            if existing_budget:
                existing_budget.LimitAmount = Decimal(existing_budget.LimitAmount) + Decimal(old_budget.LimitAmount)
                existing_budget.SpentAmount = Decimal(existing_budget.SpentAmount) + Decimal(old_budget.SpentAmount)
                existing_budget.UpdatedAt = datetime.now()
                db.delete(old_budget)
            else:
                old_budget.CategoryID = replacement_category.CategoryID
                old_budget.UpdatedAt = datetime.now()

        db.delete(category)
        db.commit()