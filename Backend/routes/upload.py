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
            "filename": d.filename,
            "file_size": d.file_size,
            "uploaded_at": d.uploaded_at.isoformat(),
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
    student_id: int = Form(...),
    file: UploadFile = File(...),
    readable_by: str = Form(default="owner"), 
    db: Session = Depends(get_db)
):
    # Verify student
    if not db.query(User).filter(User.id == student_id).first():
        raise HTTPException(status_code=404, detail="Student not found")

    content = await file.read()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = f"{student_id}_{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    try:
        # Save file
        with open(file_path, "wb") as f:
            f.write(content)

        # Save metadata in Postgres
        ext = os.path.splitext(file.filename)[1].lower()
        doc = Document(
            student_id=student_id,
            filename=file.filename,
            file_path=file_path,
            file_size=len(content),
            file_type=file.content_type or ext,
            readable_by=readable_by,
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