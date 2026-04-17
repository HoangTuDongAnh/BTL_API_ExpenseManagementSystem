from datetime import datetime, timedelta
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.support_request import SupportRequest
from app.repositories.user_repo import UserRepository


class AdminService:
    def __init__(self):
        self.user_repo = UserRepository()

    def get_dashboard_data(self, db: Session):
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.Status == "active").count()
        inactive_users = db.query(User).filter(User.Status != "active").count()

        new_reports = db.query(SupportRequest).filter(SupportRequest.Status == "pending").count()

        new_users_trend = []

        for i in range(6, -1, -1):
            target_date = (datetime.now() - timedelta(days=i)).date()

            count = (
                db.query(User)
                .filter(func.date(User.CreatedAt) == target_date)
                .count()
            )
            new_users_trend.append(count)

        recent_users_db = (
            db.query(User)
            .order_by(User.CreatedAt.desc())
            .all()
        )

        recent_users = [
            {
                "user_id": u.UserID,
                "full_name": u.FullName,
                "email": u.Email,
                "role": u.Role,
                "status": u.Status,
                "avatar": u.Avatar,
                "created_at": u.CreatedAt.strftime("%d/%m/%Y %H:%M")
            }
            for u in recent_users_db
        ]

        return {
            "total_users": total_users,
            "active_users": active_users,
            "active_today": active_users,
            "inactive_users": inactive_users,
            "new_reports": new_reports,
            "new_users_week": new_users_trend,
            "recent_users": recent_users
        }