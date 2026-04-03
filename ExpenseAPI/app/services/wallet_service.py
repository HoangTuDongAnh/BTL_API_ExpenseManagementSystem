from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.wallet import Wallet
from app.repositories.wallet_repo import WalletRepository
from app.schemas.wallet_schema import WalletCreateRequest, WalletDeleteRequest, WalletUpdateRequest


class WalletService:
    def __init__(self):
        self.wallet_repo = WalletRepository()

    def _generate_wallet_id(self, db: Session, user_id: str) -> str:
        user_suffix = user_id[-4:]
        prefix = f"W{user_suffix}"

        last_wallet = (
            db.query(Wallet)
            .filter(Wallet.WalletID.like(f"{prefix}%"))
            .order_by(Wallet.WalletID.desc())
            .first()
        )

        if last_wallet:
            last_seq = int(last_wallet.WalletID[-4:])
        else:
            last_seq = 0

        new_seq = last_seq + 1
        return f"{prefix}{new_seq:04d}"

    def get_wallets(self, db: Session, user_id: str):
        return self.wallet_repo.get_all_by_user(db, user_id)

    def create_wallet(self, db: Session, user_id: str, data: WalletCreateRequest):
        existing_wallet = self.wallet_repo.get_by_name_and_user(db, data.wallet_name, user_id)
        if existing_wallet:
            raise ValueError("Wallet name already exists")

        if data.is_default:
            self._clear_default_wallet(db, user_id)

        wallet = Wallet(
            WalletID=self._generate_wallet_id(db, user_id),
            UserID=user_id,
            WalletName=data.wallet_name,
            InitialBalance=data.initial_balance,
            CurrentBalance=data.initial_balance,
            Currency=data.currency,
            IsDefault=data.is_default,
        )

        return self.wallet_repo.create(db, wallet)

    def update_wallet(self, db: Session, wallet_id: str, user_id: str, data: WalletUpdateRequest):
        wallet = self.wallet_repo.get_by_id_and_user(db, wallet_id, user_id)
        if not wallet:
            raise ValueError("Wallet not found")

        if data.wallet_name and data.wallet_name != wallet.WalletName:
            duplicate = self.wallet_repo.get_by_name_and_user(db, data.wallet_name, user_id)
            if duplicate:
                raise ValueError("Wallet name already exists")
            wallet.WalletName = data.wallet_name

        if data.currency is not None:
            wallet.Currency = data.currency

        if data.is_default is not None:
            if data.is_default:
                self._clear_default_wallet(db, user_id)
            wallet.IsDefault = data.is_default

        wallet.UpdatedAt = datetime.now()
        db.commit()
        db.refresh(wallet)
        return wallet

    def delete_wallet(self, db: Session, wallet_id: str, user_id: str, data: WalletDeleteRequest):
        wallet = self.wallet_repo.get_by_id_and_user(db, wallet_id, user_id)
        if not wallet:
            raise ValueError("Wallet not found")

        transactions = (
            db.query(Transaction)
            .filter(Transaction.WalletID == wallet_id, Transaction.UserID == user_id)
            .all()
        )

        if data.mode == "delete_all":
            for t in transactions:
                if t.TransactionType == "expense":
                    budget = (
                        db.query(Budget)
                        .filter(
                            Budget.UserID == user_id,
                            Budget.CategoryID == t.CategoryID,
                            Budget.PeriodMonth == t.TransactionDate.month,
                            Budget.PeriodYear == t.TransactionDate.year,
                        )
                        .first()
                    )
                    if budget:
                        budget.SpentAmount = max(
                            Decimal("0"),
                            Decimal(budget.SpentAmount) - Decimal(t.Amount)
                        )
                        budget.UpdatedAt = datetime.now()

                db.delete(t)

        elif data.mode == "move_transactions":
            if not data.replacement_wallet_id:
                raise ValueError("Replacement wallet is required")

            if data.replacement_wallet_id == wallet_id:
                raise ValueError("Replacement wallet must be different from deleted wallet")

            replacement_wallet = self.wallet_repo.get_by_id_and_user(
                db, data.replacement_wallet_id, user_id
            )
            if not replacement_wallet:
                raise ValueError("Replacement wallet not found")

            for t in transactions:
                t.WalletID = replacement_wallet.WalletID
                t.UpdatedAt = datetime.now()

        else:
            raise ValueError("Invalid delete mode")

        db.delete(wallet)
        db.commit()

    def _clear_default_wallet(self, db: Session, user_id: str):
        wallets = self.wallet_repo.get_all_by_user(db, user_id)
        for wallet in wallets:
            if wallet.IsDefault:
                wallet.IsDefault = False
        db.commit()