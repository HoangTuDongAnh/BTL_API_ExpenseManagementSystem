from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.budget_schema import BudgetCreateRequest, BudgetResponse, BudgetUpdateRequest
from app.services.budget_service import BudgetService

router = APIRouter(prefix="/budgets", tags=["Budgets"])
budget_service = BudgetService()


@router.get("", response_model=list[BudgetResponse])
def get_budgets(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    budgets = budget_service.get_budgets(db, current_user.UserID)
    return [
        BudgetResponse(
            budget_id=b.BudgetID,
            user_id=b.UserID,
            category_id=b.CategoryID,
            limit_amount=b.LimitAmount,
            spent_amount=b.SpentAmount,
            period_month=b.PeriodMonth,
            period_year=b.PeriodYear,
        )
        for b in budgets
    ]


@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def create_budget(
    data: BudgetCreateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        b = budget_service.create_budget(db, current_user.UserID, data)
        return BudgetResponse(
            budget_id=b.BudgetID,
            user_id=b.UserID,
            category_id=b.CategoryID,
            limit_amount=b.LimitAmount,
            spent_amount=b.SpentAmount,
            period_month=b.PeriodMonth,
            period_year=b.PeriodYear,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: str,
    data: BudgetUpdateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        b = budget_service.update_budget(db, budget_id, current_user.UserID, data)
        return BudgetResponse(
            budget_id=b.BudgetID,
            user_id=b.UserID,
            category_id=b.CategoryID,
            limit_amount=b.LimitAmount,
            spent_amount=b.SpentAmount,
            period_month=b.PeriodMonth,
            period_year=b.PeriodYear,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        budget_service.delete_budget(db, budget_id, current_user.UserID)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))