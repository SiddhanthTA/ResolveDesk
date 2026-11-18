"""Seed a fresh ResolveDesk MongoDB collection with realistic demo tickets.

Run from the backend directory after configuring backend/.env:
    python seed_tickets.py

The script deliberately skips non-empty collections so it never overwrites test data.
"""
import os
from datetime import datetime, timedelta, timezone

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from tickets.mongo import tickets_collection  # noqa: E402


def sample_tickets():
    now = datetime.now(timezone.utc)
    return [
        {
            "title": "Unable to log in to my account",
            "description": (
                "I enter my correct email and password but the application "
                "keeps showing an invalid credentials message. I already tried "
                "resetting my password, but I still cannot sign in."
            ),
            "category": "Account",
            "status": "Resolved",
            "resolution_note": (
                "The account was temporarily locked after repeated unsuccessful "
                "attempts. We cleared the lock and completed a password reset. "
                "The user confirmed that sign-in now works."
            ),
            "created_at": now - timedelta(days=4),
            "updated_at": now - timedelta(days=3),
        },
        {
            "title": "Payment completed but subscription is still inactive",
            "description": (
                "The amount was deducted from my bank account, but my subscription "
                "continues to show as inactive even though the payment was successful."
            ),
            "category": "Billing",
            "status": "Resolved",
            "resolution_note": (
                "The payment notification timed out before the subscription could "
                "be activated. We verified the transaction and safely reprocessed "
                "the activation event. Subscription access is now active."
            ),
            "created_at": now - timedelta(days=3),
            "updated_at": now - timedelta(days=2, hours=20),
        },
        {
            "title": "PDF upload fails for larger documents",
            "description": (
                "The application returns an error whenever I upload a PDF document "
                "larger than a few megabytes. Smaller files upload successfully."
            ),
            "category": "Technical",
            "status": "Resolved",
            "resolution_note": (
                "The upload endpoint was using an outdated request-size limit. "
                "We corrected the limit and verified the upload flow with a larger "
                "PDF file."
            ),
            "created_at": now - timedelta(days=2),
            "updated_at": now - timedelta(days=1, hours=18),
        },
        {
            "title": "Profile changes are not being saved",
            "description": (
                "I update my name and contact information and press Save, but the "
                "old profile details appear again when I return to the page."
            ),
            "category": "General",
            "status": "Resolved",
            "resolution_note": (
                "The profile update request was missing two required fields. We "
                "corrected the form payload and verified that the updated details "
                "persist after refreshing the page."
            ),
            "created_at": now - timedelta(days=1),
            "updated_at": now - timedelta(hours=20),
        },
        {
            "title": "Dashboard takes a long time to load",
            "description": (
                "The dashboard sometimes takes more than a minute to display the "
                "latest ticket information. Other pages load normally."
            ),
            "category": "Technical",
            "status": "Open",
            "resolution_note": None,
            "created_at": now - timedelta(hours=5),
            "updated_at": now - timedelta(hours=5),
        },
    ]


def main():
    existing_count = tickets_collection.count_documents({})
    if existing_count:
        print(
            f"Seed skipped: the tickets collection already contains "
            f"{existing_count} document(s). No existing data was changed."
        )
        return

    result = tickets_collection.insert_many(sample_tickets())
    print(f"Seeded {len(result.inserted_ids)} demo tickets.")
    print("Four resolved tickets are ready for AI similarity suggestions.")


if __name__ == "__main__":
    main()
