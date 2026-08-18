from typing import Any

from pydantic import BaseModel, Field


class LayoutCreate(BaseModel):
    room_id: str = Field(min_length=1)
    name: str = Field(min_length=1, max_length=100)
    furniture: list[dict[str, Any]]


class LayoutResponse(LayoutCreate):
    id: str