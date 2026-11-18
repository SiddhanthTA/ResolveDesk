from django.conf import settings
from pymongo import MongoClient

client = MongoClient(
    settings.MONGODB_URI,
    serverSelectionTimeoutMS=5000
)

db = client[settings.MONGODB_DATABASE]

tickets_collection = db["tickets"]


def check_mongodb_connection():
    client.admin.command("ping")
    return True