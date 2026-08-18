from pymongo import MongoClient

from app.config import MONGODB_DATABASE, MONGODB_URI

client = None
database = None

if MONGODB_URI:
    client = MongoClient(MONGODB_URI)
    database = client[MONGODB_DATABASE]


def get_database():
    return database
