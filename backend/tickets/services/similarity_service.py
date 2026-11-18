from functools import lru_cache

import numpy as np
from sentence_transformers import SentenceTransformer

from tickets.repositories import ticket_repository


MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def get_similarity_model():
    """Load the local embedding model once per Django process."""
    return SentenceTransformer(MODEL_NAME)


def find_similar_resolved_tickets(title, description, limit=3):
    """
    Rank resolved tickets by semantic similarity to a newly entered issue.

    Scores are cosine similarities in the range -1 to 1, not probabilities.
    """
    candidates = ticket_repository.list_resolved_tickets()
    if not candidates:
        return []

    query_text = f"{title.strip()} {description.strip()}"
    candidate_texts = [
        f"{ticket.get('title', '')} {ticket.get('description', '')}"
        for ticket in candidates
    ]

    model = get_similarity_model()
    embeddings = model.encode(
        [query_text, *candidate_texts],
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )

    query_embedding = embeddings[0]
    candidate_embeddings = embeddings[1:]
    scores = np.dot(candidate_embeddings, query_embedding)

    ranked = sorted(
        zip(candidates, scores),
        key=lambda item: float(item[1]),
        reverse=True,
    )

    results = []
    for ticket, score in ranked[:limit]:
        ticket["similarity_score"] = round(float(score), 4)
        results.append(ticket)

    return results
