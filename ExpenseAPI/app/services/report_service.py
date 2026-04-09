from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models.budget import Budget
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
                        case((Transaction.TransactionType == "income", Transaction.Amount), else_=0)
                    ), 0
                ).label("total_income"),
                func.coalesce(
                    func.sum(
                        case((Transaction.TransactionType == "expense", Transaction.Amount), else_=0)
                    ), 0
                ).label("total_expense"),
            )
            .filter(Transaction.UserID == user_id, func.year(Transaction.TransactionDate) == year)
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
            .group_by(Category.CategoryID, Category.CategoryName, Category.Icon, Category.Color)
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

    def get_top_expenses(self, db: Session, user_id: str, month: int, year: int, limit: int = 5):
        results = (
            db.query(
                Transaction.TransactionID.label("transaction_id"),
                Transaction.TransactionDate.label("transaction_date"),
                Transaction.Amount.label("amount"),
                Transaction.Note.label("note"),
                Wallet.WalletID.label("wallet_id"),
                Wallet.WalletName.label("wallet_name"),
                Category.CategoryID.label("category_id"),
                Category.CategoryName.label("category_name"),
                Category.Icon.label("category_icon"),
                Category.Color.label("category_color"),
            )
            .join(Wallet, Transaction.WalletID == Wallet.WalletID)
            .join(Category, Transaction.CategoryID == Category.CategoryID)
            .filter(
                Transaction.UserID == user_id,
                Transaction.TransactionType == "expense",
                func.month(Transaction.TransactionDate) == month,
                func.year(Transaction.TransactionDate) == year,
            )
            .order_by(Transaction.Amount.desc(), Transaction.TransactionDate.desc())
            .limit(limit)
            .all()
        )

        return [
            {
                "transaction_id": r.transaction_id,
                "transaction_date": r.transaction_date,
                "amount": Decimal(r.amount),
                "note": r.note,
                "wallet_id": r.wallet_id,
                "wallet_name": r.wallet_name,
                "category_id": r.category_id,
                "category_name": r.category_name,
                "category_icon": r.category_icon,
                "category_color": r.category_color,
            }
            for r in results
        ]

    def get_budget_progress(self, db: Session, user_id: str, month: int, year: int):
        budgets = (
            db.query(
                Budget.BudgetID.label("budget_id"),
                Budget.CategoryID.label("category_id"),
                Budget.LimitAmount.label("limit_amount"),
                Budget.SpentAmount.label("spent_amount"),
                Category.CategoryName.label("category_name"),
                Category.Icon.label("category_icon"),
                Category.Color.label("category_color"),
            )
            .join(Category, Budget.CategoryID == Category.CategoryID)
            .filter(
                Budget.UserID == user_id,
                Budget.PeriodType == "month",
                Budget.PeriodYear == year,
                Budget.PeriodMonth == month,
            )
            .order_by(Budget.SpentAmount.desc())
            .all()
        )

        output = []
        for item in budgets:
            limit_amount = Decimal(item.limit_amount)
            spent_amount = Decimal(item.spent_amount)
            remaining_amount = limit_amount - spent_amount

            if limit_amount > 0:
                percentage_used = ((spent_amount * Decimal("100")) / limit_amount).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )
            else:
                percentage_used = Decimal("0.00")

            if spent_amount > limit_amount:
                status = "over"
            elif spent_amount == limit_amount:
                status = "reached"
            else:
                status = "normal"

            output.append(
                {
                    "budget_id": item.budget_id,
                    "category_id": item.category_id,
                    "category_name": item.category_name,
                    "category_icon": item.category_icon,
                    "category_color": item.category_color,
                    "limit_amount": limit_amount,
                    "spent_amount": spent_amount,
                    "remaining_amount": remaining_amount,
                    "percentage_used": percentage_used,
                    "status": status,
                }
            )

        return output
