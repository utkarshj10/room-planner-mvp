from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.database import get_database


router = APIRouter(
    prefix="/api/layouts",
    tags=["layouts"],
)


class LayoutCreate(BaseModel):
    room_id: str = Field(min_length=1)
    name: str = Field(min_length=1, max_length=100)
    furniture: list


class LayoutResponse(LayoutCreate):
    id: str


@router.post("", response_model=LayoutResponse)
def save_layout(layout: LayoutCreate):
    database = get_database()

    if database is None:
        raise HTTPException(
            status_code=503,
            detail="Database not connected",
        )

    layout_id = str(uuid4())

    layout_data = {
        "id": layout_id,
        **layout.model_dump(),
    }

    database.layouts.insert_one(layout_data)

    return layout_data


@router.get(
    "/{room_id}",
    response_model=list[LayoutResponse],
)
def get_saved_layouts(room_id: str):
    database = get_database()

    if database is None:
        raise HTTPException(
            status_code=503,
            detail="Database not connected",
        )

    layouts = list(
        database.layouts.find(
            {"room_id": room_id},
            {"_id": 0},
        )
    )

    return layouts


@router.delete("/{layout_id}")
def delete_layout(layout_id: str):
    database = get_database()

    if database is None:
        raise HTTPException(
            status_code=503,
            detail="Database not connected",
        )

    result = database.layouts.delete_one(
        {"id": layout_id}
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Layout not found",
        )

    return {
        "message": "Layout deleted successfully"
    }