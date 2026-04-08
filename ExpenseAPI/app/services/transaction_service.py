from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.wallet import Wallet
from app.repositories.transaction_repo import TransactionRepository
from app.schemas.transaction_schema import TransactionCreateRequest, TransactionUpdateRequest


class TransactionService:
    def __init__(self):
        self.transaction_repo = TransactionRepository()

    def _generate_transaction_id(self, db: Session) -> str:
        date_part = datetime.now().strftime("%y%m%d")
        prefix = f"TXN{date_part}"

        last_transaction = (
            db.query(Transaction)
            .filter(Transaction.TransactionID.like(f"{prefix}%"))
            .order_by(Transaction.TransactionID.desc())
            .first()
        )

        last_seq = int(last_transaction.TransactionID[-4:]) if last_transaction else 0
        new_seq = last_seq + 1
        return f"{prefix}{new_seq:04d}"

    def _apply_budget_spent_delta(
        self,
        db: Session,
        user_id: str,
        category_id: str,
        tx_date,
        amount_delta: Decimal,
    ) -> None:
        budgets = (
            db.query(Budget)
            .filter(
                Budget.UserID == user_id,
                Budget.CategoryID == category_id,
                Budget.StartDate <= tx_date,
                Budget.EndDate >= tx_date,
            )
            .all()
        )

        for budget in budgets:
            next_value = Decimal(budget.SpentAmount) + Decimal(amount_delta)
            if next_value < 0:
                next_value = Decimal("0")

            budget.SpentAmount = next_value
            budget.UpdatedAt = datetime.now()

    def get_transactions(self, db: Session, user_id: str):
        return self.transaction_repo.get_all_by_user(db, user_id)

    def create_transaction(self, db: Session, user_id: str, data: TransactionCreateRequest):
        wallet = (
            db.query(Wallet)
            .filter(Wallet.WalletID == data.wallet_id, Wallet.UserID == user_id)
            .first()
        )
        if not wallet:
            raise ValueError("Wallet not found")

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

        if data.transaction_type == "expense" and Decimal(wallet.CurrentBalance) < Decimal(data.amount):
            raise ValueError("Insufficient wallet balance")

        transaction = Transaction(
            TransactionID=self._generate_transaction_id(db),
            UserID=user_id,
            WalletID=data.wallet_id,
            CategoryID=data.category_id,
            TransactionType=data.transaction_type,
            Amount=data.amount,
            TransactionDate=data.transaction_date,
            Note=data.note,
            IsRecurring=data.is_recurring,
            RecurInterval=data.recur_interval,
        )

        if data.transaction_type == "income":
            wallet.CurrentBalance = Decimal(wallet.CurrentBalance) + Decimal(data.amount)
        else:
            wallet.CurrentBalance = Decimal(wallet.CurrentBalance) - Decimal(data.amount)
            self._apply_budget_spent_delta(
                db=db,
                user_id=user_id,
                category_id=data.category_id,
                tx_date=data.transaction_date,
                amount_delta=Decimal(data.amount),
            )

        db.add(transaction)
        wallet.UpdatedAt = datetime.now()
        db.commit()
        db.refresh(transaction)
        return transaction

    def update_transaction(self, db: Session, transaction_id: str, user_id: str, data: TransactionUpdateRequest):
        transaction = self.transaction_repo.get_by_id_and_user(db, transaction_id, user_id)
        if not transaction:
            raise ValueError("Transaction not found")

        old_wallet = (
            db.query(Wallet)
            .filter(Wallet.WalletID == transaction.WalletID, Wallet.UserID == user_id)
            .first()
        )
        if not old_wallet:
            raise ValueError("Original wallet not found")

        old_type = transaction.TransactionType
        old_amount = Decimal(transaction.Amount)
        old_date = transaction.TransactionDate
        old_category_id = transaction.CategoryID

        if old_type == "income":
            old_wallet.CurrentBalance = Decimal(old_wallet.CurrentBalance) - old_amount
        else:
            old_wallet.CurrentBalance = Decimal(old_wallet.CurrentBalance) + old_amount
            self._apply_budget_spent_delta(
                db=db,
                user_id=user_id,
                category_id=old_category_id,
                tx_date=old_date,
                amount_delta=-old_amount,
            )

        new_wallet_id = data.wallet_id if data.wallet_id is not None else transaction.WalletID
        new_category_id = data.category_id if data.category_id is not None else transaction.CategoryID
        new_type = data.transaction_type if data.transaction_type is not None else transaction.TransactionType
        new_amount = Decimal(data.amount) if data.amount is not None else Decimal(transaction.Amount)
        new_date = data.transaction_date if data.transaction_date is not None else transaction.TransactionDate

        new_wallet = (
            db.query(Wallet)
            .filter(Wallet.WalletID == new_wallet_id, Wallet.UserID == user_id)
            .first()
        )
        if not new_wallet:
            raise ValueError("Wallet not found")

        new_category = (
            db.query(Category)
            .filter(
                Category.CategoryID == new_category_id,
                ((Category.UserID == user_id) | (Category.UserID.is_(None)))
            )
            .first()
        )
        if not new_category:
            raise ValueError("Category not found")

        if new_type == "expense" and Decimal(new_wallet.CurrentBalance) < new_amount:
            raise ValueError("Insufficient wallet balance")

        if new_type == "income":
            new_wallet.CurrentBalance = Decimal(new_wallet.CurrentBalance) + new_amount
        else:
            new_wallet.CurrentBalance = Decimal(new_wallet.CurrentBalance) - new_amount
            self._apply_budget_spent_delta(
                db=db,
                user_id=user_id,
                category_id=new_category_id,
                tx_date=new_date,
                amount_delta=new_amount,
            )

        transaction.WalletID = new_wallet_id
        transaction.CategoryID = new_category_id
        transaction.TransactionType = new_type
        transaction.Amount = new_amount
        transaction.TransactionDate = new_date

        if data.note is not None:
            transaction.Note = data.note
        if data.is_recurring is not None:
            transaction.IsRecurring = data.is_recurring
        if data.recur_interval is not None:
            transaction.RecurInterval = data.recur_interval

        transaction.UpdatedAt = datetime.now()
        old_wallet.UpdatedAt = datetime.now()
        new_wallet.UpdatedAt = datetime.now()

        db.commit()
        db.refresh(transaction)
        return transaction

    def delete_transaction(self, db: Session, transaction_id: str, user_id: str):
        transaction = self.transaction_repo.get_by_id_and_user(db, transaction_id, user_id)
        if not transaction:
            raise ValueError("Transaction not found")

        wallet = (
            db.query(Wallet)
            .filter(Wallet.WalletID == transaction.WalletID, Wallet.UserID == user_id)
            .first()
        )
        if not wallet:
            raise ValueError("Wallet not found")

        if transaction.TransactionType == "income":
            wallet.CurrentBalance = Decimal(wallet.CurrentBalance) - Decimal(transaction.Amount)
        else:
            wallet.CurrentBalance = Decimal(wallet.CurrentBalance) + Decimal(transaction.Amount)
            self._apply_budget_spent_delta(
                db=db,
                user_id=user_id,
                category_id=transaction.CategoryID,
                tx_date=transaction.TransactionDate,
                amount_delta=-Decimal(transaction.Amount),
            )

        wallet.UpdatedAt = datetime.now()
        self.transaction_repo.delete(db, transaction)