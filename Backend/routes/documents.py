from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Document
from services.extract import get_pdf_page_count
from services.authorization import require_user, require_document_owner, require_professor_class
import os
import json
from datetime import datetime

router = APIRouter(prefix="/documents", tags=["documents"])


def _page_count_for_document(doc: Document) -> int | None:
    """Prefer the real PDF page count so older size-based values are corrected."""
    if os.path.splitext(doc.filename)[1].lower() == ".pdf" and os.path.exists(doc.file_path):
        actual_pages = get_pdf_page_count(doc.file_path)
        if actual_pages is not None:
            return actual_pages

    if doc.pages is not None:
        return doc.pages
    return max(1, doc.file_size // 50000) if doc.file_size else None

def to_ui_doc(doc: Document) -> dict:
    # Use stored document_format, fallback to extension-based detection
    if doc.document_format:
        doc_type = doc.document_format
    else:
        ext = os.path.splitext(doc.filename)[1].lower()
        doc_type = "PDF"
        if ext == ".txt":
            doc_type = "TXT"
        elif ext in (".doc", ".docx"):
            doc_type = "DOC"
        
    subject_val = doc.subject or "General"
    subject_lower = subject_val.lower()
    if "physics" in subject_lower:
        color = "blue"
    elif "chemistry" in subject_lower:
        color = "amber"
    elif "math" in subject_lower:
        color = "emerald"
    elif "resume" in subject_lower:
        color = "orange"
    elif "interview" in subject_lower:
        color = "violet"
    else:
        color = "blue"
        
    delta = datetime.utcnow() - doc.uploaded_at
    if delta.days == 0:
        time_str = "Just now" if delta.seconds < 3600 else f"{delta.seconds // 3600} hours ago"
    elif delta.days == 1:
        time_str = "1 day ago"
    else:
        time_str = f"{delta.days} days ago"

    # Recalculate PDFs so old size-based values do not remain visible.
    pages = _page_count_for_document(doc)
    size_mb = round(doc.file_size / (1024 * 1024), 2)
    
    # Use stored title, fallback to filename
    display_name = doc.title if doc.title else doc.filename
    
    return {
        "id": f"db-{doc.id}",
        "name": display_name,
        "filename": doc.filename,
        "type": doc_type,
        "subject": subject_val,
        "subjectColor": color,
        "pages": pages,
        "sizeMB": size_mb,
        "uploadedAt": time_str,
        "status": "ready",
        "category": doc.category or "Personal Learning",
        "documentType": doc.document_type or "general",
        "visibility": doc.visibility or "private",
        "classroom_id": doc.classroom_id
    }

@router.get("/data")
async def get_documents_data(student_id: int = Query(...), db: Session = Depends(get_db)):
    from services.document_resolver import get_role_visible_docs
    user = require_user(student_id, db)
    db_docs = get_role_visible_docs(user.id, user.role, db)

    db_docs = sorted(db_docs, key=lambda document: document.uploaded_at or datetime.min, reverse=True)
    
    
    combined_docs = [to_ui_doc(d) for d in db_docs]
    
    # Recalculate KPIs
    total_docs = len(combined_docs)
    unique_subjects = len(set(d["subject"].lower() for d in combined_docs if d.get("subject")))
    
    kpis = [
        {"id": "1", "value": str(total_docs), "label": "Total Documents", "color": "blue", "iconType": "docs"},
        {"id": "2", "value": str(unique_subjects), "label": "Subjects", "color": "violet", "iconType": "subjects"},
    ]
    
    # Recalculate workspaces dynamically
    from collections import defaultdict
    category_counts = defaultdict(int)
    category_subject_counts = defaultdict(lambda: defaultdict(int))
    
    for d in combined_docs:
        cat = d.get("category") or "Personal Learning"
        subj = d.get("subject") or "General"
        category_counts[cat] += 1
        category_subject_counts[cat][subj] += 1
        
    workspaces = [
        {
            "id": "1",
            "name": "Studies",
            "count": category_counts["Studies"],
            "children": [
                {"id": f"1::{subj}", "name": subj, "count": count}
                for subj, count in sorted(category_subject_counts["Studies"].items())
            ],
        },
        {
            "id": "2",
            "name": "Resume & Interview",
            "count": category_counts["Resume & Interview"],
            "children": [
                {"id": f"2::{subj}", "name": subj, "count": count}
                for subj, count in sorted(category_subject_counts["Resume & Interview"].items())
            ],
        },
        {
            "id": "3",
            "name": "Personal Learning",
            "count": category_counts["Personal Learning"],
            "children": [
                {"id": f"3::{subj}", "name": subj, "count": count}
                for subj, count in sorted(category_subject_counts["Personal Learning"].items())
            ],
        },
    ]
    
    return {
        "kpis": kpis,
        "workspaces": workspaces,
        "documents": combined_docs
    }


@router.delete("/{document_id}")
def delete_document(document_id: int, user_id: int = Query(...), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    require_document_owner(doc, user_id, db)
    
    # 1. Delete from ChromaDB
    try:
        from chroma_store import delete_document_chunks
        delete_document_chunks(document_id)
    except Exception as e:
        print(f"Error deleting chunks from ChromaDB for document {document_id}: {e}")
        
    # 2. Delete physical file from filesystem
    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            print(f"Error deleting file from disk: {e}")
            
    # 3. Delete from Postgres database
    student_id = doc.student_id
    db.delete(doc)
    db.commit()
    
    # 4. Trigger topic synchronization to cleanup topics of deleted document
    try:
        from services.practice.topic_extractor import extract_topics_from_documents
        extract_topics_from_documents(student_id, db)
    except Exception as sync_err:
        print(f"Error synchronizing topics after deletion: {sync_err}")
        
    return {"message": "Document deleted successfully"}


@router.post("/publish")
def publish_document(document_id: str, classroom_id: int, user_id: int, db: Session = Depends(get_db)):
    try:
        doc_db_id = int(document_id.replace("db-", ""))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid document id")

    doc = db.query(Document).filter(Document.id == doc_db_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    require_document_owner(doc, user_id, db)
    require_professor_class(user_id, classroom_id, db)

    doc.classroom_id = classroom_id
    doc.visibility = "course_shared"
    doc.owner_role = "professor"
    
    # Check if ClassResource already exists
    from classroom_models import ClassResource
    existing = db.query(ClassResource).filter(
        ClassResource.class_id == classroom_id,
        ClassResource.file_path == doc.file_path
    ).first()
    
    if not existing:
        resource = ClassResource(
            class_id=classroom_id,
            title=doc.title or doc.filename,
            type=doc.document_format or "TXT",
            file_path=doc.file_path,
            uploaded_by=user_id
        )
        db.add(resource)
        
    db.commit()
    return {"success": True, "message": "Document published to classroom successfully"}
