from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class Template(BaseModel):
    """Domain model for a persisted report template."""

    model_config = ConfigDict(populate_by_name=True, str_strip_whitespace=True)

    id: UUID
    name: str
    structure_id: UUID = Field(alias="structure_id")
    html_content: str = Field("", alias="html_content")
    definition_json: Dict[str, Any] = Field(default_factory=dict, alias="definition_json")
    created_at: datetime = Field(alias="created_at")
    updated_at: datetime = Field(alias="updated_at")


class TemplateCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str
    structure_id: UUID
    html_content: str = ""
    definition_json: Dict[str, Any] = Field(default_factory=dict)


class TemplateUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: Optional[str] = None
    structure_id: Optional[UUID] = None
    html_content: Optional[str] = None
    definition_json: Optional[Dict[str, Any]] = None


class FilterOperator(str, Enum):
    equals = "equals"
    not_equals = "not_equals"
    contains = "contains"
    starts_with = "starts_with"
    ends_with = "ends_with"
    gt = "gt"
    gte = "gte"
    lt = "lt"
    lte = "lte"
    in_list = "in"


class SortDirection(str, Enum):
    asc = "asc"
    desc = "desc"


class PreviewFilter(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    field: str
    operator: FilterOperator = FilterOperator.equals
    value: Any = None


class PreviewSort(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    field: str
    direction: SortDirection = SortDirection.asc


class PreviewDataRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    limit: int = Field(default=50, ge=1, le=5000)
    offset: int = Field(default=0, ge=0)
    filters: List[PreviewFilter] = Field(default_factory=list)
    group_by: Optional[str] = None
    sorts: List[PreviewSort] = Field(default_factory=list)


class ParameterOptionsRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    field: str
    limit: int = Field(default=100, ge=1, le=500)
    filters: List[PreviewFilter] = Field(default_factory=list)
