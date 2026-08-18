from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import check_database_connection
from app.routes.rooms import router as rooms_router
from app.routes.layouts import router as layouts_router


app = FastAPI(
    title="Room Planner API",
    version="1.0.0",
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


@app.get("/api/health")
def health_check():
    database_connected = check_database_connection()

    return {
        "status": "ok",
        "service": "FastAPI backend",
        "database": (
            "connected"
            if database_connected
            else "not connected"
        ),
    }


app.include_router(rooms_router)
app.include_router(layouts_router)