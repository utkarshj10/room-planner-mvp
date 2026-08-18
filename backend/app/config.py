import os

from dotenv import load_dotenv


load_dotenv()


MONGODB_URI = os.getenv(
    "MONGODB_URI",
    "",
)

MONGODB_DATABASE = os.getenv(
    "MONGODB_DATABASE",
    "room_planner",
)

GROQ_API_KEY = os.getenv(
    "GROQ_API_KEY",
    "",
)

GROQ_MODEL = os.getenv(
    "GROQ_MODEL",
    "openai/gpt-oss-20b",
)