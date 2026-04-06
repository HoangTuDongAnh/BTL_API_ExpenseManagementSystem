from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.auth_schema import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.schemas.otp_schema import OTPVerifyRequest, OTPResendRequest
from app.services.auth_service import AuthService
from app.services.otp_service import OTPService

router = APIRouter(prefix="/auth", tags=["Auth"])

auth_service = AuthService()
otp_service = OTPService()


# ================= REGISTER =================
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    try:
        user = auth_service.register(db, data)

        return UserResponse(
            user_id=user.UserID,
            full_name=user.FullName,
            email=user.Email,
            phone_number=user.PhoneNumber,
            avatar=user.Avatar,
            role=user.Role,
            status=user.Status,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# ================= VERIFY OTP =================
@router.post("/verify-otp")
def verify_otp(data: OTPVerifyRequest, db: Session = Depends(get_db)):
    try:
        auth_service.verify_otp(db, data.email, data.otp)
        return {"message": "OTP verified successfully"}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# ================= RESEND OTP =================
@router.post("/resend-otp")
def resend_otp(data: OTPResendRequest, db: Session = Depends(get_db)):
    try:
        otp_service.create_otp(db, data.email)
        return {"message": "OTP sent successfully"}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# ================= LOGIN =================
@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    try:
        result = auth_service.login(db, data)
        user = result["user"]

        return TokenResponse(
            access_token=result["access_token"],
            user=UserResponse(
                user_id=user.UserID,
                full_name=user.FullName,
                email=user.Email,
                phone_number=user.PhoneNumber,
                avatar=user.Avatar,
                role=user.Role,
                status=user.Status,
            ),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# ================= GET CURRENT USER =================
@router.get("/me", response_model=UserResponse)
def get_me(current_user=Depends(get_current_user)):
    return UserResponse(
        user_id=current_user.UserID,
        full_name=current_user.FullName,
        email=current_user.Email,
        phone_number=current_user.PhoneNumber,
        avatar=current_user.Avatar,
        role=current_user.Role,
        status=current_user.Status,
    )