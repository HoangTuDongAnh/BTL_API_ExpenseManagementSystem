from fastapi import APIRouter, Depends

from app.core.role_dependencies import require_admin

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/dashboard")
def get_admin_dashboard(current_user=Depends(require_admin)):
    return {
        "message": "Admin dashboard endpoint is available",
        "user_id": getattr(current_user, "UserID", None),
        "role": getattr(current_user, "Role", None),
    }
