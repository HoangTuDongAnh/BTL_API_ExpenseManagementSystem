from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user import User


class UserRepository:
    def get_by_email(self, db: Session, email: str) -> User | None:
        return db.query(User).filter(User.Email == email).first()

    def get_by_id(self, db: Session, user_id: str) -> User | None:
        return db.query(User).filter(User.UserID == user_id).first()

    def create(self, db: Session, user: User) -> User:
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def update(self, db: Session, user: User) -> User:
        db.commit()
        db.refresh(user)
        return user

    def delete(self, db: Session, user: User) -> None:
        db.delete(user)
        db.commit()

    def count_all(self, db: Session) -> int:
        return db.query(func.count(User.UserID)).scalar()

    def count_active(self, db: Session) -> int:
        return db.query(func.count(User.UserID)).filter(User.Status == "active").scalar()

    def count_inactive(self, db: Session) -> int:
        return db.query(func.count(User.UserID)).filter(User.Status != "active").scalar()

    def get_recent_users(self, db: Session, limit: int = 5):
        return db.query(User).order_by(User.UserID.desc()).limit(limit).all()
