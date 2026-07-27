import chromadb
import os
from services.embedding import get_embeddings

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
_collection = None


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
        return {"documents": [[]], "metadatas": [[]]}

    embeddings = get_embeddings([query])
    print(f"[DEBUG] raw embeddings returned: {str(embeddings)[:200]}")

    n = min(top_k, count)

    where_filter = None
    if allowed_doc_ids is not None:
        if len(allowed_doc_ids) == 0:
            return {"documents": [[]], "metadatas": [[]]}
        elif len(allowed_doc_ids) == 1:
            where_filter = {"document_id": allowed_doc_ids[0]}
        else:
            where_filter = {"document_id": {"$in": allowed_doc_ids}}

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