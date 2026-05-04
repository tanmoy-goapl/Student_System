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
    results = query_chunks(question, top_k=top_k)

    print("=== CHROMA RESULTS ===")
    print(results)

    documents = results.get("documents", [[]])
    metadatas = results.get("metadatas", [[]])

    # ✅ guard for empty
    if not documents or not documents[0]:
        return []

    docs_list = documents[0]
    metas_list = metadatas[0]

    # ✅ collect doc_ids first (avoid N+1 queries)
    doc_ids = {
        m.get("document_id")
        for m in metas_list
        if m and m.get("document_id") is not None
    }

    if not doc_ids:
        return []

    # ✅ fetch all documents in one query
    db_docs = db.query(Document).filter(Document.id.in_(doc_ids)).all()
    doc_map = {d.id: d for d in db_docs}

    chunks = []

    for text, meta in zip(docs_list, metas_list):
        if not meta:
            continue

        doc = doc_map.get(meta.get("document_id"))
        if not doc:
            continue

        # 🔐 Access control
        if user_role == "admin":
            allowed = True
        elif user_role == "professor":
            allowed = (
                doc.student_id == user_id
                or doc.readable_by in ["professor", "all"]
            )
        else:
            allowed = (
                doc.student_id == user_id
                or doc.readable_by == "all"
            )

        if not allowed:
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