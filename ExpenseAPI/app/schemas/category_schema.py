from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CategoryCreateRequest(BaseModel):
    category_name: str = Field(..., min_length=1, max_length=100)
    icon: Optional[str] = Field(default=None, max_length=50)
    color: Optional[str] = Field(default=None, max_length=10)
    is_default: bool = False


class CategoryUpdateRequest(BaseModel):
    category_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    icon: Optional[str] = Field(default=None, max_length=50)
    color: Optional[str] = Field(default=None, max_length=10)
    is_default: Optional[bool] = None


class CategoryDeleteRequest(BaseModel):
    replacement_category_id: str = Field(..., min_length=1, max_length=15)


class CategoryResponse(BaseModel):
    category_id: str
    user_id: Optional[str] = None
    category_name: str
    icon: Optional[str] = None
    color: Optional[str] = None
    is_default: bool

    model_config = ConfigDict(from_attributes=True)