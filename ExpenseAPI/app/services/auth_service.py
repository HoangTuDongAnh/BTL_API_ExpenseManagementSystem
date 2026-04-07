from datetime import datetime

from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.schemas.auth_schema import LoginRequest, RegisterRequest


class AuthService:
    def __init__(self):
        self.user_repo = UserRepository()

    def _generate_user_id(self, db: Session) -> str:
        date_part = datetime.now().strftime("%y%m%d")
        prefix = f"U{date_part}"

        last_user = (
            db.query(User)
            .filter(User.UserID.like(f"{prefix}%"))
            .order_by(User.UserID.desc())
            .first()
        )

        if last_user:
            last_seq = int(last_user.UserID[-4:])
        else:
            last_seq = 0

        new_seq = last_seq + 1
        return f"{prefix}{new_seq:04d}"

    def register(self, db: Session, data: RegisterRequest):
        existing_user = self.user_repo.get_by_email(db, data.email)
        if existing_user:
            raise ValueError("Email already exists")

        user = User(
            UserID=self._generate_user_id(db),
            FullName=data.full_name,
            Email=data.email,
            PasswordHash=hash_password(data.password),
            PhoneNumber=data.phone_number,
            Avatar=data.avatar,
            Role="user",
            Status="active",
        )

        return self.user_repo.create(db, user)

    def login(self, db: Session, data: LoginRequest):
        user = self.user_repo.get_by_email(db, data.email)
        if not user:
            raise ValueError("Invalid email or password")

        if user.Status != "active":
            raise ValueError("Account is not active")

        if not verify_password(data.password, user.PasswordHash):
            raise ValueError("Invalid email or password")

        token = create_access_token(
            {
                "sub": user.UserID,
                "email": user.Email,
                "role": user.Role,
            }
        )

        return {"access_token": token, "user": user}