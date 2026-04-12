from sqlalchemy import Column, DateTime, ForeignKey, String, Unicode
from sqlalchemy.sql import func

from app.core.database import Base


class SupportRequest(Base):
    __tablename__ = "SupportRequests"

    SupportRequestID = Column(String(17), primary_key=True, index=True)
    UserID = Column(String(15), ForeignKey("Users.UserID", ondelete="CASCADE"), nullable=False, index=True)
    Subject = Column(Unicode(200), nullable=False)
    Message = Column(Unicode(2000), nullable=False)
    SupportType = Column(String(20), nullable=False)
    Priority = Column(String(10), nullable=False, default="medium")
    Status = Column(String(20), nullable=False, default="pending")
    AdminReply = Column(Unicode(2000), nullable=True)
    CreatedAt = Column(DateTime, nullable=False, server_default=func.getdate())
    UpdatedAt = Column(DateTime, nullable=False, server_default=func.getdate(), onupdate=func.getdate())
    ViewedAt = Column(DateTime, nullable=True)
    RepliedAt = Column(DateTime, nullable=True)
    ClosedAt = Column(DateTime, nullable=True)
