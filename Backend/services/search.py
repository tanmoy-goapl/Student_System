from sqlalchemy.orm import Session
from models import Document
from chroma_store import query_chunks


def search_relevant_chunks(
    question: str,
    user_id: int,
    user_role: str,
    db: Session,
    top_k: int = 5,
):
    # 🔐 Pre-filter by allowed document IDs for the user
    if user_role == "admin":
        allowed_docs = db.query(Document).all()
    elif user_role == "professor":
        allowed_docs = db.query(Document).filter(
            (Document.student_id == user_id) |
            (Document.readable_by.in_(["professor", "all"]))
        ).all()
    else:
        allowed_docs = db.query(Document).filter(
            (Document.student_id == user_id) |
            (Document.readable_by == "all")
        ).all()

    allowed_doc_ids = [d.id for d in allowed_docs]
    if not allowed_doc_ids:
        return []

    results = query_chunks(question, top_k=top_k, allowed_doc_ids=allowed_doc_ids)

    print("=== CHROMA RESULTS ===")
    print(results)

    documents = results.get("documents", [[]])
    metadatas = results.get("metadatas", [[]])

    # ✅ guard for empty
    if not documents or not documents[0]:
        return []

    docs_list = documents[0]
    metas_list = metadatas[0]

    # ✅ fetch all documents in one query
    db_docs = db.query(Document).filter(Document.id.in_(allowed_doc_ids)).all()
    doc_map = {d.id: d for d in db_docs}

    chunks = []

    for text, meta in zip(docs_list, metas_list):
        if not meta:
            continue

        doc = doc_map.get(meta.get("document_id"))
        if not doc:
            continue

        chunks.append({
            "text": text,
            "document": doc.filename,
            "chunk_index": meta.get("chunk_index", 0),
        })

    return chunks


def build_rich_context(chunks):
    if not chunks:
        return "NO_CONTEXT_FOUND"

    parts = []
    for i, c in enumerate(chunks, 1):
        parts.append(
            f"[Excerpt {i} — Source: {c['document']}]\n{c['text']}"
        )

    return "\n\n" + ("\n" + "─" * 60 + "\n").join(parts)