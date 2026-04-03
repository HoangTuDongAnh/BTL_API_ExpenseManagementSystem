from sqlalchemy import Boolean, Column, DateTime, DECIMAL, ForeignKey, String
from sqlalchemy.sql import func

from app.core.database import Base


class Wallet(Base):
    __tablename__ = "Wallets"

    WalletID = Column(String(12), primary_key=True, index=True)
    UserID = Column(String(15), ForeignKey("Users.UserID"), nullable=False, index=True)
    WalletName = Column(String(100), nullable=False)
    InitialBalance = Column(DECIMAL(15, 2), nullable=False, default=0)
    CurrentBalance = Column(DECIMAL(15, 2), nullable=False, default=0)
    Currency = Column(String(10), nullable=False, default="VND")
    IsDefault = Column(Boolean, nullable=False, default=False)
    CreatedAt = Column(DateTime, nullable=False, server_default=func.getdate())
    UpdatedAt = Column(DateTime, nullable=False, server_default=func.getdate(), onupdate=func.getdate())