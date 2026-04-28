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

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]

    chunks = []

    for text, meta in zip(documents, metadatas):
        doc = db.query(Document).filter(Document.id == meta["document_id"]).first()

        if not doc:
            continue

        # Access control
        if user_role == "admin":
            pass
        elif user_role == "professor":
            if not (doc.student_id == user_id or doc.readable_by in ["professor", "all"]):
                continue
        else:
            if not (doc.student_id == user_id or doc.readable_by == "all"):
                continue

        chunks.append({
            "text": text,
            "document": doc.filename,
            "chunk_index": meta["chunk_index"],
        })

    return chunks


def build_rich_context(chunks):
    if not chunks:
        return ""

    parts = []
    for i, c in enumerate(chunks, 1):
        parts.append(
            f"[Excerpt {i} — Source: {c['document']}]\n{c['text']}"
        )

    return "\n\n" + ("\n" + "─" * 60 + "\n").join(parts)