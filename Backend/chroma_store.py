# chroma_store.py

import chromadb
from chromadb.config import Settings
from services.embedding import get_embeddings

CHROMA_DIR = "./chroma_db"
COLLECTION_NAME = "document_chunks"

_client = None
_collection = None


def get_collection():
    global _client, _collection

    if _collection is None:
        _client = chromadb.Client(
            Settings(
                persist_directory=CHROMA_DIR,
                anonymized_telemetry=False,
            )
        )

        _collection = _client.get_or_create_collection(
            name=COLLECTION_NAME
        )

    return _collection


def upsert_chunks(document_id: int, chunks: list[str]):
    collection = get_collection()

    # ⚠️ Guard: skip empty chunks
    chunks = [c for c in chunks if c and c.strip()]
    if not chunks:
        print(f"⚠️ No valid chunks for doc {document_id}")
        return

    ids = [f"{document_id}_{i}" for i in range(len(chunks))]
    metadatas = [
        {"document_id": document_id, "chunk_index": i}
        for i in range(len(chunks))
    ]

    # ✅ IMPORTANT: DO NOT pass embeddings
    collection.upsert(
        ids=ids,
        documents=chunks,
        metadatas=metadatas,
    )
def query_chunks(query: str, top_k: int = 5):
    collection = get_collection()

    query_embedding = get_embeddings([query])[0]

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
    )

    return results


def delete_document_chunks(document_id: int):
    collection = get_collection()

    collection.delete(
        where={"document_id": document_id}
    )