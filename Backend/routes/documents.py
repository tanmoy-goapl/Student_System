from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Document
import os
from datetime import datetime

router = APIRouter(prefix="/documents", tags=["documents"])

STATIC_DOCUMENTS = [
    {
        "id": "1",
        "name": "Quantum Physics Notes.pdf",
        "type": "PDF",
        "subject": "Physics",
        "subjectColor": "blue",
        "pages": 42,
        "sizeMB": 3.2,
        "uploadedAt": "2 days ago",
        "status": "ready",
        "category": "Studies"
    },
    {
        "id": "2",
        "name": "Calculus Textbook Ch1-5.pdf",
        "type": "PDF",
        "subject": "Maths",
        "subjectColor": "emerald",
        "pages": 118,
        "sizeMB": 12.4,
        "uploadedAt": "3 days ago",
        "status": "ready",
        "category": "Studies"
    },
    {
        "id": "3",
        "name": "Chemistry Lab Reports.doc",
        "type": "DOC",
        "subject": "Chemistry",
        "subjectColor": "amber",
        "pages": 24,
        "sizeMB": 1.8,
        "uploadedAt": "5 days ago",
        "status": "processing",
        "category": "Studies"
    },
    {
        "id": "4",
        "name": "Wave Mechanics Overview.pdf",
        "type": "PDF",
        "subject": "Physics",
        "subjectColor": "blue",
        "pages": 31,
        "sizeMB": 2.6,
        "uploadedAt": "1 week ago",
        "status": "ready",
        "category": "Studies"
    },
    {
        "id": "5",
        "name": "Resume - Software Engineer.pdf",
        "type": "PDF",
        "subject": "Resume",
        "subjectColor": "orange",
        "pages": 2,
        "sizeMB": 0.4,
        "uploadedAt": "1 week ago",
        "status": "ready",
        "category": "Resume & Interview"
    },
    {
        "id": "6",
        "name": "Interview Prep Guide.pdf",
        "type": "PDF",
        "subject": "Interview",
        "subjectColor": "violet",
        "pages": 56,
        "sizeMB": 4.1,
        "uploadedAt": "2 weeks ago",
        "status": "ready",
        "category": "Resume & Interview"
    },
    {
        "id": "7",
        "name": "Thermodynamics Cheat Sheet.txt",
        "type": "TXT",
        "subject": "Physics",
        "subjectColor": "blue",
        "pages": 4,
        "sizeMB": 0.1,
        "uploadedAt": "2 weeks ago",
        "status": "ready",
        "category": "Studies"
    },
    {
        "id": "8",
        "name": "Organic Chemistry Reactions.pdf",
        "type": "PDF",
        "subject": "Chemistry",
        "subjectColor": "amber",
        "pages": 38,
        "sizeMB": 5.7,
        "uploadedAt": "3 weeks ago",
        "status": "ready",
        "category": "Studies"
    },
]

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
        
    subject_val = doc.subject or "Personal"
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

    # Use stored pages, fallback to estimate
    pages = doc.pages if doc.pages else max(1, doc.file_size // 50000)
    size_mb = round(doc.file_size / (1024 * 1024), 2)
    
    # Use stored title, fallback to filename
    display_name = doc.title if doc.title else doc.filename
    
    return {
        "id": f"db-{doc.id}",
        "name": display_name,
        "type": doc_type,
        "subject": subject_val,
        "subjectColor": color,
        "pages": pages,
        "sizeMB": size_mb,
        "uploadedAt": time_str,
        "status": "ready",
        "category": doc.category or "Personal Learning"
    }

@router.get("/data")
async def get_documents_data(student_id: int = 1, db: Session = Depends(get_db)):
    # Fetch user's documents from Postgres
    db_docs = db.query(Document).filter(Document.student_id == student_id).all()
    mapped_db_docs = [to_ui_doc(d) for d in db_docs]
    
    # Combined documents list
    combined_docs = STATIC_DOCUMENTS + mapped_db_docs
    
    # Recalculate KPIs
    total_docs = len(combined_docs)
    unique_subjects = len(set(d["subject"].lower() for d in combined_docs if d.get("subject")))
    processing_count = sum(1 for d in combined_docs if d.get("status") == "processing")
    ready_count = sum(1 for d in combined_docs if d.get("status") == "ready")
    
    kpis = [
        {"id": "1", "value": str(total_docs), "label": "Total Documents", "color": "blue", "iconType": "docs"},
        {"id": "2", "value": str(unique_subjects), "label": "Subjects", "color": "violet", "iconType": "subjects"},
    ]
    
    # Recalculate workspaces/folders count
    studies_physics = sum(1 for d in combined_docs if d.get("category") == "Studies" and "physics" in d.get("subject", "").lower())
    studies_chemistry = sum(1 for d in combined_docs if d.get("category") == "Studies" and "chemistry" in d.get("subject", "").lower())
    studies_maths = sum(1 for d in combined_docs if d.get("category") == "Studies" and "math" in d.get("subject", "").lower())
    total_studies = studies_physics + studies_chemistry + studies_maths
    
    total_resume_interview = sum(1 for d in combined_docs if d.get("category") == "Resume & Interview")
    resume_docs = sum(1 for d in combined_docs if d.get("category") == "Resume & Interview" and "resume" in d.get("subject", "").lower())
    interview_docs = sum(1 for d in combined_docs if d.get("category") == "Resume & Interview" and "interview" in d.get("subject", "").lower())
    total_personal = sum(1 for d in combined_docs if d.get("category") == "Personal Learning")
    
    workspaces = [
        {
            "id": "1",
            "name": "Studies",
            "count": total_studies,
            "children": [
                {"id": "1-1", "name": "Physics", "count": studies_physics},
                {"id": "1-2", "name": "Chemistry", "count": studies_chemistry},
                {"id": "1-3", "name": "Maths", "count": studies_maths},
            ],
        },
        {
            "id": "2",
            "name": "Resume & Interview",
            "count": total_resume_interview,
            "children": [
                {"id": "2-1", "name": "Resume", "count": resume_docs},
                {"id": "2-2", "name": "Interview", "count": interview_docs},
            ],
        },
        {
            "id": "3",
            "name": "Personal Learning",
            "count": total_personal,
            "children": [],
        },
    ]
    
    return {
        "kpis": kpis,
        "workspaces": workspaces,
        "documents": combined_docs
    }


@router.delete("/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Document not found")
    
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
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully"}
