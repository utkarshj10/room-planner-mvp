from uuid import uuid4

from fastapi import APIRouter

from app.database import get_database
from app.models.room import RoomCreate, RoomResponse

router = APIRouter(prefix="/api/rooms", tags=["rooms"])


@router.post("", response_model=RoomResponse)
def create_room(room: RoomCreate):
    room_id = str(uuid4())

    room_data = {
        "id": room_id,
        **room.model_dump(),
    }

    database = get_database()

    if database is not None:
        database.rooms.insert_one(room_data)

    return room_data
