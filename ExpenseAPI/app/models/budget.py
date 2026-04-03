from sqlalchemy import Column, DateTime, DECIMAL, ForeignKey, SmallInteger, String
from sqlalchemy.dialects.mssql import TINYINT
from sqlalchemy.sql import func

from app.core.database import Base


class Budget(Base):
    __tablename__ = "Budgets"

    BudgetID = Column(String(13), primary_key=True, index=True)
    UserID = Column(String(15), ForeignKey("Users.UserID"), nullable=False, index=True)
    CategoryID = Column(String(15), ForeignKey("Categories.CategoryID"), nullable=False, index=True)
    LimitAmount = Column(DECIMAL(15, 2), nullable=False)
    SpentAmount = Column(DECIMAL(15, 2), nullable=False, default=0)
    PeriodMonth = Column(TINYINT, nullable=False)
    PeriodYear = Column(SmallInteger, nullable=False)
    CreatedAt = Column(DateTime, nullable=False, server_default=func.getdate())
    UpdatedAt = Column(DateTime, nullable=False, server_default=func.getdate(), onupdate=func.getdate())