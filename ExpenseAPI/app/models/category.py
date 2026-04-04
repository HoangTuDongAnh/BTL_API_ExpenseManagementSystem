from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Unicode
from sqlalchemy.sql import func

from app.core.database import Base


class Category(Base):
    __tablename__ = "Categories"

    CategoryID = Column(String(15), primary_key=True, index=True)
    UserID = Column(String(15), ForeignKey("Users.UserID"), nullable=True, index=True)
    CategoryName = Column(Unicode(100), nullable=False)
    Icon = Column(String(50), nullable=True)
    Color = Column(String(10), nullable=True)
    IsDefault = Column(Boolean, nullable=False, default=False)
    CreatedAt = Column(DateTime, nullable=False, server_default=func.getdate())
    UpdatedAt = Column(DateTime, nullable=False, server_default=func.getdate(), onupdate=func.getdate())