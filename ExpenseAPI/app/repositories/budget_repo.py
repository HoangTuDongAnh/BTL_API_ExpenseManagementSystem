from sqlalchemy.orm import Session

from app.models.budget import Budget


class BudgetRepository:
    def get_all_by_user(self, db: Session, user_id: str) -> list[Budget]:
        return (
            db.query(Budget)
            .filter(Budget.UserID == user_id)
            .order_by(Budget.PeriodYear.desc(), Budget.PeriodMonth.desc(), Budget.CreatedAt.desc())
            .all()
        )

    def get_by_id_and_user(self, db: Session, budget_id: str, user_id: str) -> Budget | None:
        return (
            db.query(Budget)
            .filter(Budget.BudgetID == budget_id, Budget.UserID == user_id)
            .first()
        )

    def get_existing(self, db: Session, user_id: str, category_id: str, period_month: int, period_year: int) -> Budget | None:
        return (
            db.query(Budget)
            .filter(
                Budget.UserID == user_id,
                Budget.CategoryID == category_id,
                Budget.PeriodMonth == period_month,
                Budget.PeriodYear == period_year,
            )
            .first()
        )

    def create(self, db: Session, budget: Budget) -> Budget:
        db.add(budget)
        db.commit()
        db.refresh(budget)
        return budget

    def delete(self, db: Session, budget: Budget) -> None:
        db.delete(budget)
        db.commit()