from sqlalchemy import Boolean, Column, Date, DateTime, DECIMAL, ForeignKey, String, Unicode
from sqlalchemy.sql import func

from app.core.database import Base


class Transaction(Base):
    __tablename__ = "Transactions"

    TransactionID = Column(String(17), primary_key=True, index=True)
    UserID = Column(String(15), ForeignKey("Users.UserID"), nullable=False, index=True)
    WalletID = Column(String(12), ForeignKey("Wallets.WalletID"), nullable=False, index=True)
    CategoryID = Column(String(15), ForeignKey("Categories.CategoryID"), nullable=False, index=True)
    TransactionType = Column(String(10), nullable=False)
    Amount = Column(DECIMAL(15, 2), nullable=False)
    TransactionDate = Column(Date, nullable=False)
    Note = Column(Unicode(500), nullable=True)
    IsRecurring = Column(Boolean, nullable=False, default=False)
    RecurInterval = Column(String(20), nullable=True)
    CreatedAt = Column(DateTime, nullable=False, server_default=func.getdate())
    UpdatedAt = Column(DateTime, nullable=False, server_default=func.getdate(), onupdate=func.getdate())