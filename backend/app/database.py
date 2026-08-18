from pymongo import MongoClient

from app.config import MONGODB_DATABASE, MONGODB_URI


client = None
database = None


if MONGODB_URI:
    client = MongoClient(
        MONGODB_URI,
        serverSelectionTimeoutMS=5000,
    )

    database = client[MONGODB_DATABASE]


def get_database():
    return database


def check_database_connection() -> bool:
    if client is None:
        return False

    try:
        client.admin.command("ping")
        return True
    except Exception:
        return False