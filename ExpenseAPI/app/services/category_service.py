from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction
from app.repositories.category_repo import CategoryRepository
from app.schemas.category_schema import (
    CategoryCreateRequest,
    CategoryDeleteRequest,
    CategoryUpdateRequest,
)


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

        if last_category:
            last_seq = int(last_category.CategoryID[-3:])
        else:
            last_seq = 0

        new_seq = last_seq + 1
        return f"{prefix}{new_seq:03d}"

    def get_categories(self, db: Session, user_id: str):
        return self.category_repo.get_all_by_user(db, user_id)

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
            IsDefault=data.is_default,
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

        if data.is_default is not None:
            category.IsDefault = data.is_default

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
                    Budget.PeriodMonth == old_budget.PeriodMonth,
                    Budget.PeriodYear == old_budget.PeriodYear,
                )
                .first()
            )

            if existing_budget:
                existing_budget.SpentAmount = (
                    Decimal(existing_budget.SpentAmount) + Decimal(old_budget.SpentAmount)
                )
                existing_budget.UpdatedAt = datetime.now()
                db.delete(old_budget)
            else:
                old_budget.CategoryID = replacement_category.CategoryID
                old_budget.UpdatedAt = datetime.now()

        db.delete(category)
        db.commit()