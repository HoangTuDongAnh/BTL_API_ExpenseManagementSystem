from datetime import datetime
from decimal import Decimal

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.transaction import Transaction
from app.models.wallet import Wallet


class ReportService:
    def get_monthly_summary(self, db: Session, user_id: str, year: int):
        results = (
            db.query(
                func.month(Transaction.TransactionDate).label("month"),
                func.coalesce(
                    func.sum(
                        case(
                            (Transaction.TransactionType == "income", Transaction.Amount),
                            else_=0,
                        )
                    ),
                    0,
                ).label("total_income"),
                func.coalesce(
                    func.sum(
                        case(
                            (Transaction.TransactionType == "expense", Transaction.Amount),
                            else_=0,
                        )
                    ),
                    0,
                ).label("total_expense"),
            )
            .filter(
                Transaction.UserID == user_id,
                func.year(Transaction.TransactionDate) == year,
            )
            .group_by(func.month(Transaction.TransactionDate))
            .order_by(func.month(Transaction.TransactionDate))
            .all()
        )

        return [
            {
                "month": int(r.month),
                "total_income": Decimal(r.total_income),
                "total_expense": Decimal(r.total_expense),
            }
            for r in results
        ]

    def get_category_summary(self, db: Session, user_id: str, month: int, year: int):
        results = (
            db.query(
                Category.CategoryID.label("category_id"),
                Category.CategoryName.label("category_name"),
                Category.Icon.label("icon"),
                Category.Color.label("color"),
                func.coalesce(func.sum(Transaction.Amount), 0).label("total_amount"),
            )
            .join(Category, Transaction.CategoryID == Category.CategoryID)
            .filter(
                Transaction.UserID == user_id,
                Transaction.TransactionType == "expense",
                func.month(Transaction.TransactionDate) == month,
                func.year(Transaction.TransactionDate) == year,
            )
            .group_by(
                Category.CategoryID,
                Category.CategoryName,
                Category.Icon,
                Category.Color,
            )
            .order_by(func.sum(Transaction.Amount).desc())
            .all()
        )

        total = sum(Decimal(r.total_amount) for r in results) if results else Decimal("0")

        output = []
        for r in results:
            amount = Decimal(r.total_amount)
            percentage = Decimal("0.00")

            if total > 0:
                percentage = ((amount * Decimal("100")) / total).quantize(Decimal("0.01"))

            output.append(
                {
                    "category_id": r.category_id,
                    "category_name": r.category_name,
                    "icon": r.icon,
                    "color": r.color,
                    "total_amount": amount,
                    "percentage": percentage,
                }
            )

        return output

    def get_dashboard_overview(self, db: Session, user_id: str):
        now = datetime.now()
        month = now.month
        year = now.year

        total_balance = (
            db.query(func.coalesce(func.sum(Wallet.CurrentBalance), 0))
            .filter(Wallet.UserID == user_id)
            .scalar()
        )

        monthly_income = (
            db.query(func.coalesce(func.sum(Transaction.Amount), 0))
            .filter(
                Transaction.UserID == user_id,
                Transaction.TransactionType == "income",
                func.month(Transaction.TransactionDate) == month,
                func.year(Transaction.TransactionDate) == year,
            )
            .scalar()
        )

        monthly_expense = (
            db.query(func.coalesce(func.sum(Transaction.Amount), 0))
            .filter(
                Transaction.UserID == user_id,
                Transaction.TransactionType == "expense",
                func.month(Transaction.TransactionDate) == month,
                func.year(Transaction.TransactionDate) == year,
            )
            .scalar()
        )

        transaction_count = (
            db.query(func.count(Transaction.TransactionID))
            .filter(
                Transaction.UserID == user_id,
                func.month(Transaction.TransactionDate) == month,
                func.year(Transaction.TransactionDate) == year,
            )
            .scalar()
        )

        return {
            "total_balance": Decimal(total_balance),
            "monthly_income": Decimal(monthly_income),
            "monthly_expense": Decimal(monthly_expense),
            "transaction_count": int(transaction_count or 0),
        }