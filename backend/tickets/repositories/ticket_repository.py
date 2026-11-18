from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId

from tickets.mongo import tickets_collection


def serialize_ticket(ticket):
    """Convert a MongoDB ticket document into JSON-friendly values."""
    if ticket is None:
        return None

    ticket["id"] = str(ticket.pop("_id"))
    for field in ("created_at", "updated_at"):
        value = ticket.get(field)
        if value is not None:
            ticket[field] = value.isoformat()

    return ticket


def list_tickets(filters=None):
    """Return tickets matching the supplied MongoDB filters."""
    filters = filters or {}
    documents = tickets_collection.find(filters).sort("created_at", -1)
    return [serialize_ticket(document) for document in documents]


def get_ticket_by_id(ticket_id):
    """Find one ticket by its MongoDB ObjectId; return None if invalid or absent."""
    try:
        object_id = ObjectId(ticket_id)
    except (InvalidId, TypeError):
        return None

    document = tickets_collection.find_one({"_id": object_id})
    return serialize_ticket(document)


def create_ticket(validated_data):
    """Create a ticket with server-managed status and timestamps."""
    now = datetime.now(timezone.utc)
    ticket = {
        **validated_data,
        "status": "Open",
        "resolution_note": None,
        "created_at": now,
        "updated_at": now,
    }

    result = tickets_collection.insert_one(ticket)
    return get_ticket_by_id(str(result.inserted_id))


def update_ticket(ticket_id, validated_data):
    """Update an existing ticket and return its latest representation."""
    try:
        object_id = ObjectId(ticket_id)
    except (InvalidId, TypeError):
        return None

    update_data = {
        **validated_data,
        "updated_at": datetime.now(timezone.utc),
    }

    result = tickets_collection.update_one(
        {"_id": object_id},
        {"$set": update_data},
    )

    if result.matched_count == 0:
        return None

    return get_ticket_by_id(ticket_id)


def list_resolved_tickets():
    """Return only resolved tickets for similarity comparisons."""
    documents = tickets_collection.find({"status": "Resolved"}).sort("created_at", -1)
    return [serialize_ticket(document) for document in documents]
