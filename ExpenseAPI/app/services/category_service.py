from datetime import datetime
from decimal import Decimal
from sqlalchemy import or_

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
        target_year = period["period_year"]
        target_month = period["period_month"] or datetime.now().month
        target_week = period["period_week"] or datetime.now().isocalendar()[1]

        budgets = (
            db.query(Budget)
            .filter(
                Budget.UserID == user_id,
                or_(
                    (Budget.PeriodType == "year") & (Budget.PeriodYear == target_year),
                    (Budget.PeriodType == "month") & (Budget.PeriodYear == target_year) & (
                                Budget.PeriodMonth == target_month),
                    (Budget.PeriodType == "week") & (Budget.PeriodYear == target_year) & (
                                Budget.PeriodWeek == target_week)
                )
            )
            .all()
        )

        budget_map = {}
        for b in budgets:
            if b.CategoryID not in budget_map:
                budget_map[b.CategoryID] = b
            else:
                existing_type = budget_map[b.CategoryID].PeriodType
                if b.PeriodType == "week":
                    budget_map[b.CategoryID] = b
                elif b.PeriodType == "month" and existing_type == "year":
                    budget_map[b.CategoryID] = b
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
        if data.action == "move" and data.target_category_id == category_id:
            raise ValueError("Không thể chuyển vào chính nó")
        if not category:
            raise ValueError("Category not found")
        if category.IsDefault:
            raise ValueError("Không thể xóa danh mục mặc định")
        try:
            if data.action == "other":
                other = self.category_repo.get_by_name_and_user(db, "Khác", user_id)

                if not other:
                    raise ValueError("Không tìm thấy danh mục 'Khác'")

                db.query(Transaction).filter(
                    Transaction.CategoryID == category_id,
                    Transaction.UserID == user_id
                ).update({
                    "CategoryID": other.CategoryID,
                    "UpdatedAt": datetime.now()
                })

            elif data.action == "move":
                if not data.target_category_id:
                    raise ValueError("Thiếu target_category_id")

                db.query(Transaction).filter(
                    Transaction.CategoryID == category_id,
                    Transaction.UserID == user_id
                ).update({
                    "CategoryID": data.target_category_id,
                    "UpdatedAt": datetime.now()
                })

            else:
                raise ValueError("action không hợp lệ")

            db.query(Budget).filter(
                Budget.CategoryID == category_id,
                Budget.UserID == user_id
            ).delete()

            db.delete(category)

            db.commit()

        except:
            db.rollback()
            raise