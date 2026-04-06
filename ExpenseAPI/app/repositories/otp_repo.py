from sqlalchemy.orm import Session
from app.models.otp import OTP


class OTPRepository:

    def create(self, db, otp):
        db.add(otp)
        db.flush()
        return otp

    def get_valid_otp(self, db: Session, email: str, otp_code: str):
        return db.query(OTP).filter(
            OTP.email == email,
            OTP.otp_code == otp_code,
            OTP.is_used == False
        ).first()

    def get_latest_otp(self, db: Session, email: str):
        return (
            db.query(OTP)
            .filter(OTP.email == email)
            .order_by(OTP.created_at.desc())
            .first()
        )

    def delete_by_email(self, db: Session, email: str):
        db.query(OTP).filter(OTP.email == email).delete()
        db.commit()