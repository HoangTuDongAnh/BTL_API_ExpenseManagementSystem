from datetime import datetime, timedelta
import random
import hashlib
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.otp import OTP
from app.repositories.otp_repo import OTPRepository
from app.services.email_service import EmailService


class OTPService:
    def __init__(self):
        self.repo = OTPRepository()
        self.email_service = EmailService()

    def generate_otp(self):
        return str(random.randint(100000, 999999))

    def hash_otp(self, otp: str):
        return hashlib.sha256(otp.encode()).hexdigest()

    def create_otp(self, db: Session, email: str):
        latest = self.repo.get_latest_otp(db, email)
        if latest and (datetime.utcnow() - latest.created_at).seconds < 30:
            raise HTTPException(400, "Please wait before requesting another OTP")

        otp_raw = self.generate_otp()
        otp_hashed = self.hash_otp(otp_raw)

        otp = OTP(
            email=email,
            otp_code=otp_hashed,
            expired_at=datetime.utcnow() + timedelta(minutes=5),
            is_used=False
        )

        self.repo.create(db, otp)

        db.commit()

        # gửi email
        self.email_service.send_otp_email(email, otp_raw)

    def verify_otp(self, db: Session, email: str, otp_input: str):
        otp = self.repo.get_latest_otp(db, email)

        if not otp:
            raise HTTPException(400, "OTP not found")

        if otp.is_used:
            raise HTTPException(400, "OTP already used")

        if datetime.utcnow() > otp.expired_at:
            raise HTTPException(400, "OTP expired")

        if otp.otp_code != self.hash_otp(otp_input):
            raise HTTPException(400, "Invalid OTP")

        otp.is_used = True
        db.commit()