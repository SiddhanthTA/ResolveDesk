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
    ticket.setdefault("next_reply_by", None)
    ticket.setdefault("is_reopened", False)
    ticket.setdefault("conversation_unlocked", False)
    ticket.setdefault("rating", None)
    ticket.setdefault("rating_note", "")
    ticket.setdefault("rating_created_at", None)
    ticket.setdefault("rating_seen_by_agent", False)
    ticket.setdefault("close_requested", False)
    ticket.setdefault("close_requested_at", None)
    ticket.setdefault("resolution_type", None)
    if ticket.get("close_requested_at") is not None:
        ticket["close_requested_at"] = ticket["close_requested_at"].isoformat()
    for field in ("last_reply_at", "rating_created_at"):
        if ticket.get(field) is not None:
            ticket[field] = ticket[field].isoformat()
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
    if update_data.get("status") == "Resolved":
        update_data["resolution_type"] = "agent"
        update_data["close_requested"] = False

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
    query = {
        "_id": object_id,
        "status": {"$ne": "Resolved"},
        "$and": [
            {"$or": [
                {count_field: {"$lt": 5}},
                {count_field: {"$exists": False}},
            ]},
            {"$or": [
                {"next_reply_by": sender_role},
                {"next_reply_by": {"$exists": False}, "last_reply_by": {"$ne": sender_role}},
            ]},
        ],
    }
    updates = {
        "$push": {"replies": reply},
        "$inc": {count_field: 1},
        "$set": {
            "last_reply_at": now,
            "last_reply_by": sender_role,
            "next_reply_by": "agent" if sender_role == "user" else "user",
            "updated_at": now,
        },
    }
    updated = tickets_collection.find_one_and_update(
        query, updates, return_document=ReturnDocument.AFTER
    )
    if updated is not None:
        return serialize_ticket(updated), "ok"

    existing = tickets_collection.find_one(
        {"_id": object_id},
        {"_id": 1, "status": 1, count_field: 1, "last_reply_by": 1, "next_reply_by": 1},
    )
    if existing is None:
        return None, "not_found"
    if existing.get("status") == "Resolved":
        return None, "ticket_resolved"
    if existing.get(count_field, 0) >= 5:
        return None, "limit_reached"
    next_role = existing.get("next_reply_by")
    if next_role is not None and next_role != sender_role:
        return None, "not_your_turn"
    if next_role is None and existing.get("last_reply_by") == sender_role:
        return None, "not_your_turn"
    return None, "not_updated"


def reopen_ticket(ticket_id):
    try:
        object_id = ObjectId(ticket_id)
    except (InvalidId, TypeError):
        return None, "not_found"

    now = datetime.now(timezone.utc)
    updated = tickets_collection.find_one_and_update(
        {"_id": object_id, "status": "Resolved", "is_reopened": {"$ne": True}},
        {"$set": {
            "status": "Open",
            "is_reopened": True,
            "conversation_unlocked": True,
            "close_requested": False,
            "resolution_type": None,
            "next_reply_by": "user",
            "rating": None,
            "rating_note": "",
            "rating_created_at": None,
            "rating_seen_by_agent": False,
            "updated_at": now,
        }},
        return_document=ReturnDocument.AFTER,
    )
    if updated is not None:
        return serialize_ticket(updated), "ok"

    existing = tickets_collection.find_one({"_id": object_id})
    if existing is None:
        return None, "not_found"
    return serialize_ticket(existing), "already_reopened" if existing.get("is_reopened") else "not_resolved"


def request_ticket_close(ticket_id):
    try:
        object_id = ObjectId(ticket_id)
    except (InvalidId, TypeError):
        return None, "not_found"
    now = datetime.now(timezone.utc)
    updated = tickets_collection.find_one_and_update(
        {"_id": object_id, "status": {"$ne": "Resolved"}, "close_requested": {"$ne": True}},
        {"$set": {"close_requested": True, "close_requested_at": now, "updated_at": now}},
        return_document=ReturnDocument.AFTER,
    )
    if updated is not None:
        return serialize_ticket(updated), "ok"
    existing = tickets_collection.find_one({"_id": object_id})
    if existing is None:
        return None, "not_found"
    if existing.get("status") == "Resolved":
        return None, "resolved"
    return serialize_ticket(existing), "already_requested"


def resolve_ticket(ticket_id, force=False):
    try:
        object_id = ObjectId(ticket_id)
    except (InvalidId, TypeError):
        return None, "not_found"
    now = datetime.now(timezone.utc)
    resolution_type = "force" if force else "agent"
    query = {"_id": object_id, "status": {"$ne": "Resolved"}}
    if not force:
        query["close_requested"] = True
    existing_ticket = tickets_collection.find_one({"_id": object_id})
    if existing_ticket is None:
        return None, "not_found"
    note = existing_ticket.get("resolution_note") if force else (existing_ticket.get("resolution_note") or "The support team has marked this ticket as resolved.")
    updated = tickets_collection.find_one_and_update(
        query,
        {"$set": {
            "status": "Resolved",
            "resolution_note": note,
            "resolution_type": resolution_type,
            "close_requested": False,
            "updated_at": now,
        }},
        return_document=ReturnDocument.AFTER,
    )
    if updated is not None:
        return serialize_ticket(updated), "ok"
    existing = tickets_collection.find_one({"_id": object_id})
    if existing is None:
        return None, "not_found"
    return None, "not_requested" if not force and existing.get("status") != "Resolved" else "resolved"


def save_ticket_rating(ticket_id, rating, note):
    try:
        object_id = ObjectId(ticket_id)
    except (InvalidId, TypeError):
        return None, "not_found"

    now = datetime.now(timezone.utc)
    updated = tickets_collection.find_one_and_update(
        {"_id": object_id, "status": "Resolved"},
        {"$set": {
            "rating": rating,
            "rating_note": note,
            "rating_created_at": now,
            "rating_seen_by_agent": False,
        }},
        return_document=ReturnDocument.AFTER,
    )
    if updated is not None:
        return serialize_ticket(updated), "ok"

    existing = tickets_collection.find_one({"_id": object_id}, {"_id": 1})
    if existing is None:
        return None, "not_found"
    return None, "not_resolved"


def mark_ticket_rating_seen(ticket_id):
    try:
        object_id = ObjectId(ticket_id)
    except (InvalidId, TypeError):
        return None
    tickets_collection.update_one(
        {"_id": object_id, "rating": {"$ne": None}},
        {"$set": {"rating_seen_by_agent": True}},
    )
    return get_ticket_by_id(ticket_id)
