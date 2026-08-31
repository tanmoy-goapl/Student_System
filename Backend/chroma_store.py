import chromadb
import logging
import os
import re
from services.embedding import get_embeddings

logger = logging.getLogger(__name__)

# ── Monkey-patch ChromaDB 0.5.0 bug ──────────────────────────────
# _decode_seq_id expects bytes but SQLite sometimes returns an int directly.
# This patch handles both cases gracefully.
try:
    import chromadb.segment.impl.metadata.sqlite as _cdb_sqlite

    _original_decode = _cdb_sqlite._decode_seq_id

    def _patched_decode_seq_id(seq_id_bytes):
        if isinstance(seq_id_bytes, int):
            return seq_id_bytes
        return _original_decode(seq_id_bytes)

    _cdb_sqlite._decode_seq_id = _patched_decode_seq_id
except Exception:
    pass  # If the internal module moves, silently skip
# ─────────────────────────────────────────────────────────────────

CHROMA_DIR = os.path.abspath("./chroma_db")
COLLECTION_NAME = "document_chunks"

_client = None
_embedding_failure_logged = False
_collection = None
_LEXICAL_STOP_WORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "can", "do", "for",
    "from", "how", "i", "in", "is", "it", "me", "my", "of", "on", "or",
    "please", "tell", "that", "the", "their", "this", "to", "was", "what",
    "when", "where", "which", "who", "why", "with", "you", "your",
}


def _lexical_forms(token: str) -> set[str]:
    """Return a small set of safe word forms for offline document search."""
    forms = {token}
    if token.endswith("isation"):
        forms.add(token[:-7] + "ization")
    elif token.endswith("ization"):
        forms.add(token[:-7] + "isation")
    if len(token) > 4 and token.endswith("s"):
        forms.add(token[:-1])
    if len(token) > 5 and token.endswith("ies"):
        forms.add(token[:-3] + "y")
    return forms


def _lexical_tokens(text: str) -> set[str]:
    tokens = re.findall(r"[a-z0-9]+", (text or "").lower())
    return {
        form
        for token in tokens
        if token not in _LEXICAL_STOP_WORDS
        for form in _lexical_forms(token)
    }


def _empty_query_result() -> dict:
    return {"documents": [[]], "metadatas": [[]], "distances": [[]]}


def _lexical_query_chunks(collection, query: str, top_k: int, where_filter=None) -> dict:
    """Search stored chunk text without downloading an embedding model.

    This is intentionally a fallback only. Normal semantic search remains the
    first choice whenever the local SentenceTransformer model is available.
    """
    get_kwargs = {}
    if where_filter is not None:
        get_kwargs["where"] = where_filter
    stored = collection.get(**get_kwargs)
    documents = stored.get("documents") or []
    metadatas = stored.get("metadatas") or []
    if not documents:
        return _empty_query_result()

    query_terms = _lexical_tokens(query)
    if not query_terms:
        return _empty_query_result()

    query_text = " ".join(re.findall(r"[a-z0-9]+", (query or "").lower()))
    ranked = []
    for index, document_text in enumerate(documents):
        text = document_text or ""
        text_terms = _lexical_tokens(text)
        matched_terms = query_terms.intersection(text_terms)
        if not matched_terms:
            continue

        score = len(matched_terms) / len(query_terms)
        normalized_text = " ".join(re.findall(r"[a-z0-9]+", text.lower()))
        if query_text and query_text in normalized_text:
            score = min(1.0, score + 0.20)
        score = min(1.0, score)
        ranked.append((score, index))

    ranked.sort(key=lambda item: (-item[0], item[1]))
    selected = ranked[: max(1, top_k)]
    result_documents = [documents[index] for _, index in selected]
    result_metadatas = [metadatas[index] if index < len(metadatas) else {} for _, index in selected]
    # Chroma distances are lower for better matches. Convert the lexical score
    # to the same 0..2 range consumed by the existing reranker.
    distances = [round(2.0 * (1.0 - score), 6) for score, _ in selected]
    return {
        "documents": [result_documents],
        "metadatas": [result_metadatas],
        "distances": [distances],
        "_retrieval_method": "lexical",
    }


def get_collection():
    global _client, _collection

    if _collection is None:
        # ✅ THIS is the correct way now
        _client = chromadb.PersistentClient(path=CHROMA_DIR)

        _collection = _client.get_or_create_collection(
            name=COLLECTION_NAME
        )

    return _collection


def upsert_chunks(document_id: int, chunks: list[str]):
    collection = get_collection()

    chunks = [c for c in chunks if c and c.strip()]
    if not chunks:
        print(f"⚠️ No valid chunks for doc {document_id}")
        return

    ids = [f"{document_id}_{i}" for i in range(len(chunks))]
    metadatas = [
        {"document_id": document_id, "chunk_index": i}
        for i in range(len(chunks))
    ]

    embeddings = get_embeddings(chunks)

    upsert_kwargs = {
        "ids": ids,
        "documents": chunks,
        "metadatas": metadatas,
    }
    
    # Only use custom embeddings if they are properly generated
    if embeddings and len(embeddings) > 0 and len(embeddings[0]) > 0:
        upsert_kwargs["embeddings"] = embeddings

    collection.upsert(**upsert_kwargs)

def query_chunks(query: str, top_k: int = 5, allowed_doc_ids: list[int] = None):
    collection = get_collection()
    count = collection.count()
    if count == 0:
        return _empty_query_result()

    where_filter = None
    if allowed_doc_ids is not None:
        if len(allowed_doc_ids) == 0:
            return _empty_query_result()
        elif len(allowed_doc_ids) == 1:
            where_filter = {"document_id": allowed_doc_ids[0]}
        else:
            where_filter = {"document_id": {"$in": allowed_doc_ids}}

    n = min(top_k, count)
    global _embedding_failure_logged
    try:
        embeddings = get_embeddings([query])
    except Exception as exc:
        if not _embedding_failure_logged:
            logger.warning(
                "Embedding model unavailable; using offline lexical document search (%s)",
                type(exc).__name__,
            )
            _embedding_failure_logged = True
        return _lexical_query_chunks(collection, query, n, where_filter)

    print(f"[DEBUG] raw embeddings returned: {str(embeddings)[:200]}")

    query_kwargs = {
        "n_results": n,
        "where": where_filter,
    }

    # Validate embedding is a non-empty float vector
    if embeddings and embeddings[0] and isinstance(embeddings[0], (list, tuple)) and len(embeddings[0]) > 0:
        query_kwargs["query_embeddings"] = [embeddings[0]]
    else:
        print("⚠️ Embedding is empty — falling back to query_texts")
        query_kwargs["query_texts"] = [query]

    return collection.query(**query_kwargs)

def delete_document_chunks(document_id: int):
    collection = get_collection()

    collection.delete(
        where={"document_id": document_id}
    )

def get_all_chunks_for_document(document_id: int) -> list[dict]:
    """Retrieves all chunks for a document ordered by chunk_index."""
    collection = get_collection()
    res = collection.get(where={"document_id": document_id})
    if not res or "documents" not in res or not res["documents"]:
        return []
    
    docs = res["documents"]
    metas = res.get("metadatas", [])
    
    items = []
    for idx, text in enumerate(docs):
        meta = metas[idx] if idx < len(metas) else {}
        chunk_idx = meta.get("chunk_index", 0)
        items.append({
            "text": text,
            "chunk_index": chunk_idx,
            "document_id": document_id
        })
    items.sort(key=lambda x: x["chunk_index"])
    return items

def get_chunks_by_ids(ids: list[str]) -> list[dict]:
    """Retrieves chunks by their IDs from ChromaDB."""
    collection = get_collection()
    res = collection.get(ids=ids)
    if not res or "documents" not in res or not res["documents"]:
        return []
    
    docs = res["documents"]
    metas = res.get("metadatas", [])
    
    items = []
    for idx, text in enumerate(docs):
        meta = metas[idx] if idx < len(metas) else {}
        chunk_idx = meta.get("chunk_index", 0)
        doc_id = meta.get("document_id", 0)
        items.append({
            "text": text,
            "chunk_index": chunk_idx,
            "document_id": doc_id
        })
    return items