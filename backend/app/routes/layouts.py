from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.database import get_database
from app.models.layout import LayoutCreate, LayoutResponse


router = APIRouter(
    prefix="/api/layouts",
    tags=["layouts"],
)


@router.post("", response_model=LayoutResponse)
def create_layout(layout: LayoutCreate):
    database = get_database()

    if database is None:
        raise HTTPException(
            status_code=503,
            detail="Database is not connected",
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
def get_room_layouts(room_id: str):
    database = get_database()

    if database is None:
        raise HTTPException(
            status_code=503,
            detail="Database is not connected",
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
            detail="Database is not connected",
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