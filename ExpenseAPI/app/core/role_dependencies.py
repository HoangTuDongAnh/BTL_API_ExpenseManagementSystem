from fastapi import Depends, HTTPException, status

from app.core.dependencies import get_current_user


def require_admin(current_user=Depends(get_current_user)):
    if getattr(current_user, "Role", None) != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user
