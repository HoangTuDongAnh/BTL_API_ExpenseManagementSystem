from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.report_schema import (
    CategorySummaryItem,
    DashboardOverviewResponse,
    MonthlySummaryItem,
)
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["Reports"])
report_service = ReportService()


@router.get("/monthly", response_model=list[MonthlySummaryItem])
def get_monthly_summary(year: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return report_service.get_monthly_summary(db, current_user.UserID, year)


@router.get("/by-category", response_model=list[CategorySummaryItem])
def get_category_summary(
    month: int,
    year: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return report_service.get_category_summary(db, current_user.UserID, month, year)


@router.get("/dashboard", response_model=DashboardOverviewResponse)
def get_dashboard_overview(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return report_service.get_dashboard_overview(db, current_user.UserID)