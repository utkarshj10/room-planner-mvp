from pydantic import BaseModel, Field


class RoomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    width: float = Field(gt=0)
    length: float = Field(gt=0)
    unit: str = Field(pattern="^(ft|m)$")


class RoomResponse(RoomCreate):
    id: str
