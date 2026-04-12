from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, String, Unicode
from sqlalchemy.sql import func

from app.core.database import Base


class SupportAttachment(Base):
    __tablename__ = "SupportAttachments"

    AttachmentID = Column(Integer, primary_key=True, index=True, autoincrement=True)
    SupportRequestID = Column(String(17), ForeignKey("SupportRequests.SupportRequestID", ondelete="CASCADE"), nullable=False, index=True)
    FileName = Column(Unicode(255), nullable=False)
    FileUrl = Column(String(500), nullable=False)
    FileType = Column(String(50), nullable=True)
    FileSize = Column(BigInteger, nullable=True)
    CreatedAt = Column(DateTime, nullable=False, server_default=func.getdate())
