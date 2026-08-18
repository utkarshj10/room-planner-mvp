from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.rooms import router as rooms_router

app = FastAPI(
    title="Room Planner API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rooms_router)


@app.get("/")
def root():
    return {
        "message": "Room Planner API is running"
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "room-planner-backend",
    }
