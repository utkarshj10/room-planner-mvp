from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.ai import get_ai_advice


router = APIRouter(
    prefix="/api/ai",
    tags=["ai"],
)


class AIAdviceRequest(BaseModel):
    room_facts: dict


class AIAdviceResponse(BaseModel):
    advice: str


@router.post(
    "/advice",
    response_model=AIAdviceResponse,
)
def generate_ai_advice(
    request: AIAdviceRequest,
):
    try:
        advice = get_ai_advice(
            request.room_facts
        )

        return {
            "advice": advice
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"AI request failed: {error}",
        )