from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.category_schema import (
    CategoryCreateRequest,
    CategoryDeleteRequest,
    CategoryResponse,
    CategoryUpdateRequest,
)
from app.services.category_service import CategoryService

router = APIRouter(prefix="/categories", tags=["Categories"])
category_service = CategoryService()


@router.get("", response_model=list[CategoryResponse])
def get_categories(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    categories = category_service.get_categories(db, current_user.UserID)
    return [
        CategoryResponse(
            category_id=c.CategoryID,
            user_id=c.UserID,
            category_name=c.CategoryName,
            icon=c.Icon,
            color=c.Color,
            is_default=c.IsDefault,
        )
        for c in categories
    ]


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        category = category_service.create_category(db, current_user.UserID, data)
        return CategoryResponse(
            category_id=category.CategoryID,
            user_id=category.UserID,
            category_name=category.CategoryName,
            icon=category.Icon,
            color=category.Color,
            is_default=category.IsDefault,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: str,
    data: CategoryUpdateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        category = category_service.update_category(db, category_id, current_user.UserID, data)
        return CategoryResponse(
            category_id=category.CategoryID,
            user_id=category.UserID,
            category_name=category.CategoryName,
            icon=category.Icon,
            color=category.Color,
            is_default=category.IsDefault,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: str,
    data: CategoryDeleteRequest = Body(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        category_service.delete_category(db, category_id, current_user.UserID, data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))