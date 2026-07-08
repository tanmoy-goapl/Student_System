from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models import User, Document
from services.extract import extract_text, chunk_text, IMAGE_EXTENSIONS
from config import UPLOAD_DIR
import os
from datetime import datetime
from chroma_store import upsert_chunks, delete_document_chunks

router = APIRouter()
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/documents/{student_id}")
def get_documents(student_id: int, db: Session = Depends(get_db)):
    """Return list of documents uploaded by a student."""
    docs = db.query(Document).filter(Document.student_id == student_id).all()
    return [
        {
            "id": d.id,
            "user_id": d.student_id,
            "title": d.title or d.filename,
            "filename": d.filename,
            "category": d.category,
            "subject": d.subject,
            "pages": d.pages,
            "file_size": d.file_size,
            "uploaded_at": d.uploaded_at.isoformat(),
            "document_format": d.document_format,
            "readable_by": d.readable_by, 
            "file_path": os.path.basename(d.file_path), 
        }
        for d in docs
    ]


@router.get("/documents/view/{document_id}")
def view_document(document_id: int, db: Session = Depends(get_db)):
    """Serve a document file for viewing."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    # Determine media type
    media_type_map = {
        ".pdf": "application/pdf",
        ".txt": "text/plain",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    ext = os.path.splitext(doc.filename)[1].lower()
    media_type = media_type_map.get(ext, "application/octet-stream")

    return FileResponse(
        doc.file_path,
        media_type=media_type,
        filename=doc.filename,
        headers={"Content-Disposition": f'inline; filename="{doc.filename}"'}
    )


@router.delete("/documents/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    """Delete a document and its chunks."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    # Delete file from disk
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)

    # delete from Chroma
    delete_document_chunks(document_id)

    db.delete(doc)
    db.commit()
    return {"message": f"Document '{doc.filename}' deleted"}

@router.post("/upload")
async def upload_file(
    user_id: int = Form(None),
    student_id: int = Form(None),
    title: str = Form(None),
    category: str = Form(None),
    subject: str = Form(None),
    readable_by: str = Form(default="owner"), 
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    actual_student_id = user_id if user_id is not None else student_id
    if not actual_student_id:
        raise HTTPException(status_code=400, detail="Missing user_id or student_id")

    # Verify student
    if not db.query(User).filter(User.id == actual_student_id).first():
        raise HTTPException(status_code=404, detail="Student not found")

    content = await file.read()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = f"{actual_student_id}_{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    try:
        # Save file
        with open(file_path, "wb") as f:
            f.write(content)

        # Derive document format from extension
        ext = os.path.splitext(file.filename)[1].lower()
        format_map = {
            ".pdf": "PDF",
            ".doc": "DOC",
            ".docx": "DOC",
            ".txt": "TXT",
            ".png": "PNG",
            ".jpg": "JPG",
            ".jpeg": "JPG",
        }
        doc_format = format_map.get(ext, ext.lstrip(".").upper() or "UNKNOWN")

        # Estimate page count
        page_count = None
        if ext == ".pdf":
            try:
                from PyPDF2 import PdfReader
                reader = PdfReader(file_path)
                page_count = len(reader.pages)
            except Exception:
                page_count = max(1, len(content) // 50000)
        elif ext == ".txt":
            # Estimate: ~3000 chars per page
            page_count = max(1, len(content) // 3000)
        else:
            page_count = max(1, len(content) // 50000)

        # Save metadata in Postgres
        doc_title = title if title else file.filename
        doc = Document(
            student_id=actual_student_id,
            filename=file.filename,         # original filename
            title=doc_title,                # user-provided title
            file_path=file_path,
            file_size=len(content),
            file_type=file.content_type or ext,
            readable_by=readable_by,
            category=category,
            subject=subject,
            pages=page_count,
            document_format=doc_format,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        # ── Extract text ─────────────────────────
        is_image = ext in IMAGE_EXTENSIONS
        text = ""
        ocr_failed = False

        try:
            text = extract_text(file_path)
        except ValueError:
            return {
                "message": "Uploaded (no text extraction support)",
                "document_id": doc.id,
                "filename": file.filename,
                "chunks_created": 0,
            }
        except Exception:
            ocr_failed = True
            text = ""

        # ── Prepare chunks ───────────────────────
        if not text.strip():
            if is_image:
                if ocr_failed:
                    chunks_to_store = [
                        f"Image uploaded: {file.filename}. OCR failed."
                    ]
                else:
                    chunks_to_store = [
                        f"Image uploaded: {file.filename}. No readable text."
                    ]
            else:
                return {
                    "message": "Uploaded (no readable text)",
                    "document_id": doc.id,
                    "filename": file.filename,
                    "chunks_created": 0,
                }
        else:
            chunks_to_store = chunk_text(text)

        # Store ONLY in Chroma
        try:
            upsert_chunks(doc.id, chunks_to_store)
            
            # Immediately trigger background topic extraction
            from services.practice_engine import extract_topics_from_documents
            extract_topics_from_documents(actual_student_id, db)
        except Exception as e:
            print("Chroma error:", e)

        return {
            "message": "Uploaded and processed successfully",
            "document_id": doc.id,
            "filename": file.filename,
            "chunks_created": len(chunks_to_store),
        }

    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))