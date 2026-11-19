from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ReturnDocument

from tickets.mongo import tickets_collection


def serialize_ticket(ticket):
    """Convert a MongoDB ticket document into JSON-friendly values."""
    if ticket is None:
        return None

    ticket["id"] = str(ticket.pop("_id"))
    ticket.pop("_demo_seed_batch", None)
    ticket.setdefault("replies", [])
    ticket.setdefault("customer_reply_count", 0)
    ticket.setdefault("agent_reply_count", 0)
    ticket.setdefault("last_reply_at", None)
    ticket.setdefault("last_reply_by", None)
    if ticket.get("last_reply_at") is not None:
        ticket["last_reply_at"] = ticket["last_reply_at"].isoformat()
    for reply in ticket["replies"]:
        if reply.get("created_at") is not None:
            reply["created_at"] = reply["created_at"].isoformat()
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


def replace_demo_seed_tickets(tickets, batch_key):
    """Replace only this named demo batch, leaving real/user-created tickets untouched."""
    tickets_collection.delete_many({"_demo_seed_batch": batch_key})
    if not tickets:
        return 0

    documents = [dict(ticket, _demo_seed_batch=batch_key) for ticket in tickets]
    result = tickets_collection.insert_many(documents)
    return len(result.inserted_ids)


def delete_all_tickets():
    """Delete every ticket document. Intended only for local development tools."""
    result = tickets_collection.delete_many({})
    return result.deleted_count


def append_ticket_reply(ticket_id, sender_role, message):
    try:
        object_id = ObjectId(ticket_id)
    except (InvalidId, TypeError):
        return None, "not_found"

    count_field = "customer_reply_count" if sender_role == "user" else "agent_reply_count"
    now = datetime.now(timezone.utc)
    reply = {"sender_role": sender_role, "message": message, "created_at": now}
    query = {"_id": object_id, "$or": [
        {count_field: {"$lt": 5}},
        {count_field: {"$exists": False}},
    ]}
    updates = {
        "$push": {"replies": reply},
        "$inc": {count_field: 1},
        "$set": {"last_reply_at": now, "last_reply_by": sender_role, "updated_at": now},
    }
    if sender_role == "user":
        updates["$set"]["status"] = "Open"

    updated = tickets_collection.find_one_and_update(
        query, updates, return_document=ReturnDocument.AFTER
    )
    if updated is not None:
        return serialize_ticket(updated), "ok"

    if tickets_collection.find_one({"_id": object_id}, {"_id": 1}) is None:
        return None, "not_found"
    return None, "limit_reached"
