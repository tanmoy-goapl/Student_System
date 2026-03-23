from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models import User, Document, DocumentChunk
from services.extract import extract_text, chunk_text, IMAGE_EXTENSIONS
from services.embedding import get_embeddings, embedding_to_string
from config import UPLOAD_DIR
import os
from datetime import datetime

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

    # Delete chunks + document from DB
    db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).delete()
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

    # Read file content (no extension or size restrictions here)
    content = await file.read()

    # Save to disk
    timestamp   = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name   = f"{student_id}_{timestamp}_{file.filename}"
    file_path   = os.path.join(UPLOAD_DIR, safe_name)

    try:
        with open(file_path, "wb") as f:
            f.write(content)

        # Persist document record
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

        # ── Extract text → chunks → embed → store ──────────────────────────
        is_image = ext in IMAGE_EXTENSIONS
        text = ""
        ocr_failed = False

        try:
            text = extract_text(file_path)
        except ValueError:
            # Completely unsupported file type (not PDF/TXT/DOCX/image)
            return {
                "message": "Uploaded successfully (file type not supported for text extraction)",
                "document_id": doc.id,
                "filename": file.filename,
                "chunks_created": 0,
            }
        except Exception as ocr_err:
            # OCR libraries missing or OCR failed — still keep the upload
            ocr_failed = True
            text = ""

        if not text.strip():
            if is_image:
                # Store a descriptive placeholder chunk so the document is
                # still searchable and the LLM knows the image was uploaded.
                if ocr_failed:
                    placeholder = (
                        f"Image file uploaded: {file.filename}. "
                        "OCR could not extract text (Tesseract may not be installed). "
                        "If this image contains handwritten or printed academic notes, "
                        "consider converting it to a PDF or typed document for full AI support."
                    )
                else:
                    placeholder = (
                        f"Image file uploaded: {file.filename}. "
                        "No readable text was detected in this image via OCR. "
                        "If this is a diagram, chart, or photo without text, "
                        "consider adding a written description as a separate text file."
                    )
                chunks_to_store = [placeholder]
            else:
                # Non-image with no extractable text — keep the file but skip chunking
                return {
                    "message": "Uploaded successfully (no readable text found in document)",
                    "document_id": doc.id,
                    "filename": file.filename,
                    "chunks_created": 0,
                }
        else:
            chunks_to_store = chunk_text(text)

        # ── Generate embeddings for all chunks in one batch call ────────────
        try:
            embeddings = get_embeddings(chunks_to_store)
        except Exception:
            embeddings = [[] for _ in chunks_to_store]   # graceful fallback

        for idx, chunk in enumerate(chunks_to_store):
            raw_emb = embeddings[idx] if idx < len(embeddings) else []
            db.add(
                DocumentChunk(
                    document_id=doc.id,
                    chunk_text=chunk,
                    chunk_index=idx,
                    embedding=embedding_to_string(raw_emb) if raw_emb else None,
                )
            )
        db.commit()

        if is_image and not text.strip():
            msg = "Image uploaded (OCR found no text; placeholder stored for reference)"
        elif is_image:
            msg = "Image uploaded and text extracted via OCR successfully"
        else:
            msg = "Uploaded and processed successfully"

        return {
            "message": msg,
            "document_id": doc.id,
            "filename": file.filename,
            "chunks_created": len(chunks_to_store),
        }

    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))
