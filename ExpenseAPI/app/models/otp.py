from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.core.database import Base


class UserOTP(Base):
    __tablename__ = "UserOTPs"

    OtpID = Column(Integer, primary_key=True, autoincrement=True)
    Email = Column(String(150), nullable=False, index=True)
    OTPCode = Column(String(6), nullable=False)
    IsUsed = Column(Boolean, nullable=False, default=False, server_default="0")
    ExpiresAt = Column(DateTime, nullable=False)
    CreatedAt = Column(DateTime, nullable=False, server_default=func.getdate())
