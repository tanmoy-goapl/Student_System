"""
services/search.py  —  MentorAI Retrieval Engine
─────────────────────────────────────────────────
Improvements over original:
  • Hybrid scoring  : combines semantic cosine similarity + keyword TF score
    so neither signal dominates alone.
  • Re-ranking      : MMR (Maximal Marginal Relevance) diversifies results so
    the LLM sees different aspects of the document rather than 5 very similar chunks.
  • Query expansion : common academic synonyms are added automatically
    ("marks" → also searches "grades", "score", etc.).
  • Adaptive top_k  : short questions get more context; long specific ones get less.
  • Rich metadata   : returns similarity score + source doc per chunk for citations.
"""

from __future__ import annotations

import os
import sys
import re
from typing import List, Tuple

import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import or_

# Ensure Backend/ is on sys.path so `models` and `services.*` imports work
# when running this file directly (python Backend/services/search.py).
CURRENT_DIR = os.path.dirname(__file__)          # .../Backend/services
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))  # .../Backend
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from models import Document, DocumentChunk
from Backend.services.embedding import get_embedding, string_to_embedding  # type: ignore

# ── Thresholds ────────────────────────────────────────────────────────────────
MIN_SEMANTIC_SIM  = 0.20   # lowered slightly so fringe-but-valid chunks aren't dropped
HYBRID_SEM_WEIGHT = 0.70   # 70% semantic + 30% keyword in hybrid score
MMR_LAMBDA        = 0.60   # MMR diversity λ  (0 = max diversity, 1 = max relevance)

# ── Academic synonym map for query expansion ──────────────────────────────────
SYNONYMS: dict[str, list[str]] = {
    "marks":       ["grades", "score", "result", "percentage", "marks"],
    "grades":      ["marks", "score", "result", "percentage"],
    "improve":     ["weak", "low", "fail", "below", "lacking", "poor"],
    "subject":     ["topic", "course", "module", "unit"],
    "exam":        ["test", "assessment", "evaluation", "quiz"],
    "attendance":  ["present", "absent", "attendance"],
    "assignment":  ["homework", "task", "project", "submission"],
    "performance": ["result", "marks", "grade", "progress"],
    "study":       ["learn", "revise", "review", "prepare"],
    "weak":        ["low", "poor", "fail", "improve", "struggling"],
    "strong":      ["good", "high", "excellent", "pass", "distinction"],
    "feedback":    ["comment", "remark", "suggestion", "advice"],
    "report":      ["card", "transcript", "result", "sheet"],
}

STOP_WORDS = {
    "what", "is", "the", "a", "an", "in", "on", "at", "to", "for",
    "of", "and", "or", "this", "that", "it", "be", "are", "was",
    "were", "do", "does", "did", "about", "me", "tell", "give",
    "how", "why", "when", "where", "which", "who", "with", "from",
    "has", "have", "had", "can", "will", "would", "could", "should",
    "pdf", "document", "file", "text", "content", "info", "information",
    "please", "my", "i", "you", "your", "am", "as", "into",
}


# ═════════════════════════════════════════════════════════════════════════════
#  PUBLIC API
# ═════════════════════════════════════════════════════════════════════════════

def search_relevant_chunks(
    question: str,
    user_id: int,
    user_role: str,
    db: Session,
    top_k: int = 5,
) -> List[DocumentChunk]:
    """
    Return the most relevant chunks for *question* from this student's documents.

    Strategy
    --------
    1. Hybrid search  (semantic + keyword combined)
    2. MMR re-ranking to ensure diversity
    3. Keyword-only fallback if embeddings unavailable
    4. First-chunk fallback so the LLM always has something
    """

    if user_role == "admin":
        # admin sees everything
        chunks = db.query(DocumentChunk).join(Document).all()

    elif user_role == "professor":
        # professor sees: their own docs + any doc marked readable by professor/all
        chunks = (
            db.query(DocumentChunk)
            .join(Document)
            .filter(or_(
                Document.student_id == user_id,
                Document.readable_by.in_(["professor", "all"]),
            ))
            .all()
        )

    else:  # student
        # student sees: their own docs + any doc marked readable by all
        chunks = (
            db.query(DocumentChunk)
            .join(Document)
            .filter(or_(
                Document.student_id == user_id,
                Document.readable_by == "all",
            ))
            .all()
        )
    if not chunks:
        return []

    # Adaptive k: more context for very short/vague questions
    words = question.split()
    effective_k = min(top_k + 2, len(chunks)) if len(words) < 6 else min(top_k, len(chunks))

    expanded_question = _expand_query(question)
    q_embed = get_embedding(expanded_question)

    # ── 1. Hybrid scored retrieval ────────────────────────────────────────────
    if q_embed:
        scored = _hybrid_score(chunks, q_embed, expanded_question)
        # Filter by minimum semantic threshold (keep if sem >= threshold OR high kw score)
        filtered = [
            (c, hybrid, sem, kw)
            for c, hybrid, sem, kw in scored
            if sem >= MIN_SEMANTIC_SIM or kw > 0.01
        ]
        if filtered:
            diverse = _mmr_rerank(filtered, q_embed, effective_k)
            return diverse

    # ── 2. Keyword-only fallback ──────────────────────────────────────────────
    kw_scored = _keyword_score(chunks, expanded_question)
    kw_scored.sort(key=lambda x: x[1], reverse=True)
    if any(s > 0 for _, s in kw_scored):
        return [c for c, _ in kw_scored[:effective_k]]

    # ── 3. Generic question — return first chunks ─────────────────────────────
    return sorted(chunks, key=lambda c: c.chunk_index)[:effective_k]


def build_rich_context(chunks: List[DocumentChunk]) -> str:
    """
    Build a labelled, numbered context string for the LLM.
    Each chunk is annotated with its source filename + chunk index.
    """
    if not chunks:
        return ""
    parts = []
    for i, chunk in enumerate(chunks, 1):
        doc_name = chunk.document.filename if chunk.document else "unknown"
        parts.append(
            f"[Excerpt {i} — Source: {doc_name}]\n{chunk.chunk_text.strip()}"
        )
    return f"\n\n{'─'*60}\n\n".join(parts)


# ═════════════════════════════════════════════════════════════════════════════
#  INTERNALS
# ═════════════════════════════════════════════════════════════════════════════

def _expand_query(question: str) -> str:
    """Add synonyms for key academic terms to broaden recall."""
    q_lower = question.lower()
    extras: list[str] = []
    for term, synonyms in SYNONYMS.items():
        if term in q_lower:
            extras.extend(s for s in synonyms if s not in q_lower)
    if extras:
        return question + " " + " ".join(extras)
    return question


def _cosine(a: list[float], b: list[float]) -> float:
    va, vb = np.array(a), np.array(b)
    na, nb = np.linalg.norm(va), np.linalg.norm(vb)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(va, vb) / (na * nb))


def _keyword_score(
    chunks: List[DocumentChunk], question: str
) -> List[Tuple[DocumentChunk, float]]:
    """TF-normalised keyword overlap score."""
    q_words = set(re.findall(r"\b\w+\b", question.lower())) - STOP_WORDS
    results = []
    for chunk in chunks:
        text = chunk.chunk_text.lower()
        n_words = max(len(text.split()), 1)
        hits = sum(1 for w in q_words if w in text)
        results.append((chunk, hits / n_words))
    return results


def _hybrid_score(
    chunks: List[DocumentChunk],
    q_embed: list[float],
    question: str,
) -> List[Tuple[DocumentChunk, float, float, float]]:
    """
    Returns list of (chunk, hybrid_score, sem_score, kw_score).
    hybrid = HYBRID_SEM_WEIGHT * sem + (1 - HYBRID_SEM_WEIGHT) * kw_norm
    """
    kw_raw = dict(_keyword_score(chunks, question))
    max_kw = max(kw_raw.values()) or 1.0

    results = []
    for chunk in chunks:
        sem = 0.0
        if chunk.embedding:
            try:
                ce = string_to_embedding(chunk.embedding)
                if ce:
                    sem = max(0.0, _cosine(q_embed, ce))
            except Exception:
                pass
        kw_norm = kw_raw.get(chunk, 0.0) / max_kw
        hybrid = HYBRID_SEM_WEIGHT * sem + (1 - HYBRID_SEM_WEIGHT) * kw_norm
        results.append((chunk, hybrid, sem, kw_norm))

    results.sort(key=lambda x: x[1], reverse=True)
    return results


def _mmr_rerank(
    scored: List[Tuple[DocumentChunk, float, float, float]],
    q_embed: list[float],
    k: int,
) -> List[DocumentChunk]:
    """
    Maximal Marginal Relevance: iteratively pick the chunk that maximises
      MMR = λ * relevance - (1-λ) * max_similarity_to_already_selected
    This ensures the returned set is both relevant AND diverse.
    """
    candidates = list(scored)
    selected: List[DocumentChunk] = []
    selected_embeds: List[list[float]] = []

    while candidates and len(selected) < k:
        best_chunk, best_score = None, -999.0
        for chunk, hybrid, sem, kw in candidates:
            relevance = hybrid
            if selected_embeds and chunk.embedding:
                try:
                    ce = string_to_embedding(chunk.embedding)
                    max_sim = max(_cosine(ce, se) for se in selected_embeds)
                    mmr = MMR_LAMBDA * relevance - (1 - MMR_LAMBDA) * max_sim
                except Exception:
                    mmr = relevance
            else:
                mmr = relevance

            if mmr > best_score:
                best_score = mmr
                best_chunk = chunk

        if best_chunk is None:
            break

        selected.append(best_chunk)
        if best_chunk.embedding:
            try:
                selected_embeds.append(string_to_embedding(best_chunk.embedding))
            except Exception:
                pass
        candidates = [c for c in candidates if c[0] is not best_chunk]

    return selected