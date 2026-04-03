from sqlalchemy import Column, DateTime, String
from sqlalchemy.sql import func

from app.core.database import Base


class User(Base):
    __tablename__ = "Users"

    UserID = Column(String(15), primary_key=True, index=True)
    FullName = Column(String(100), nullable=False)
    Email = Column(String(150), unique=True, nullable=False, index=True)
    PasswordHash = Column(String(255), nullable=False)
    PhoneNumber = Column(String(15), nullable=True)
    Avatar = Column(String(255), nullable=True)
    Role = Column(String(20), nullable=False, default="user")
    Status = Column(String(10), nullable=False, default="active")
    CreatedAt = Column(DateTime, nullable=False, server_default=func.getdate())
    UpdatedAt = Column(DateTime, nullable=False, server_default=func.getdate(), onupdate=func.getdate())