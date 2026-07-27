from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models import User, Document
from services.extract import extract_text, chunk_text, IMAGE_EXTENSIONS
from config import UPLOAD_DIR
import os
import json
from pydantic import BaseModel
from datetime import datetime
from chroma_store import upsert_chunks, delete_document_chunks

router = APIRouter()
os.makedirs(UPLOAD_DIR, exist_ok=True)

class UpdateDocumentTypeRequest(BaseModel):
    document_type: str

@router.put("/documents/{document_id}/type")
def update_document_type(document_id: int, req: UpdateDocumentTypeRequest, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    valid_types = ["resume", "marksheet", "certificate", "policy", "syllabus", "curriculum", "notes", "placement_record", "academic_calendar", "general"]
    if req.document_type not in valid_types:
        raise HTTPException(status_code=400, detail="Invalid document type")
    doc.document_type = req.document_type
    doc.tags_json = json.dumps([req.document_type])
    db.commit()
    return {"success": True, "document_type": doc.document_type}

def classify_document_rules(filename: str) -> str:
    fn_lower = filename.lower()
    if "resume" in fn_lower or "cv" == fn_lower or fn_lower.startswith("cv_") or "_cv" in fn_lower:
        return "resume"
    if any(k in fn_lower for k in ["marksheet", "grade", "transcript", "gpa", "cgpa", "marks"]):
        return "marksheet"
    if "certificate" in fn_lower or "cert" in fn_lower:
        return "certificate"
    if "policy" in fn_lower or "handbook" in fn_lower or "rules" in fn_lower:
        return "policy"
    if "syllabus" in fn_lower:
        return "syllabus"
    if "curriculum" in fn_lower or "course_structure" in fn_lower:
        return "curriculum"
    if any(k in fn_lower for k in ["notes", "lecture", "slide", "ppt", "chapter", "reading"]):
        return "notes"
    if any(k in fn_lower for k in ["placement", "job", "recruitment", "recruit"]):
        return "placement_record"
    if "calendar" in fn_lower:
        return "academic_calendar"
    return "general"

def classify_document_llm(filename: str, first_chars: str = "") -> str:
    try:
        from openai import OpenAI
        from config import GPT_API_KEY, GPT_BASE_URL, GPT_MODEL
        if GPT_API_KEY and GPT_BASE_URL:
            client = OpenAI(api_key=GPT_API_KEY, base_url=GPT_BASE_URL)
            prompt = f"""You are an institutional document classifier.
Classify the following document by its title/filename and a snippet of its text into EXACTLY one of these categories:
- resume
- marksheet
- certificate
- policy
- syllabus
- curriculum
- notes
- placement_record
- academic_calendar
- general

Filename: {filename}
Text Snippet: {first_chars[:1000]}

Respond with only the category name in lowercase (e.g. 'policy'). Do not include formatting, explanation, or other text."""
            
            completion = client.chat.completions.create(
                model=GPT_MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=10,
                temperature=0.0
            )
            val = completion.choices[0].message.content.strip().lower()
            valid_types = ["resume", "marksheet", "certificate", "policy", "syllabus", "curriculum", "notes", "placement_record", "academic_calendar", "general"]
            if val in valid_types:
                return val
    except Exception as e:
        print("Classification LLM error:", e)
    return "general"


@router.get("/documents/{student_id}")
def get_documents(student_id: int, db: Session = Depends(get_db)):
    """Return list of documents uploaded by a student."""
    docs = db.query(Document).filter(Document.student_id == student_id).order_by(Document.uploaded_at.desc()).all()
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
    owner_role: str = Form(None),
    visibility: str = Form(None),
    document_type: str = Form(None),
    tags: str = Form(None),
    classroom_id: int = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    actual_student_id = user_id if user_id is not None else student_id
    if not actual_student_id:
        raise HTTPException(status_code=400, detail="Missing user_id or student_id")

    # Verify user
    uploader = db.query(User).filter(User.id == actual_student_id).first()
    if not uploader:
        raise HTTPException(status_code=404, detail="User not found")

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
        
        # Determine uploader user role and define visibility
        inferred_role = uploader.role if uploader else "student"
        final_owner_role = owner_role if owner_role else inferred_role
        
        if not visibility:
            if inferred_role == "admin":
                final_visibility = "admin_shared"
            elif inferred_role == "professor":
                final_visibility = "course_shared"
            else:
                final_visibility = "private"
        else:
            # Normalize legacy visibility types
            norm_vis = visibility.lower().strip()
            if norm_vis in ["institution", "all", "universal"]:
                final_visibility = "universal"
            elif norm_vis in ["classroom", "course_shared"]:
                final_visibility = "course_shared"
            elif norm_vis == "admin_shared":
                final_visibility = "admin_shared"
            else:
                final_visibility = "private"

        # Auto-classify (rule-based first)
        inferred_type = classify_document_rules(file.filename)
        final_doc_type = document_type if document_type else inferred_type
        
        if tags:
            parsed_tags = [t.strip() for t in tags.split(",") if t.strip()]
        else:
            parsed_tags = [final_doc_type] if final_doc_type else ["general"]

        doc = Document(
            student_id=actual_student_id,
            owner_id=actual_student_id,
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
            document_type=final_doc_type,
            owner_role=final_owner_role,
            visibility=final_visibility,
            tags_json=json.dumps(parsed_tags),
            classroom_id=classroom_id,
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
            print("\n" + "=" * 80)
            print("EXTRACTED TEXT")
            print("=" * 80)
            print(text[:5000])      # Print first 5000 characters
            print("=" * 80)
        except ValueError:
            return {
                "message": "Uploaded (no text extraction support)",
                "document_id": doc.id,
                "filename": file.filename,
                "chunks_created": 0,
                "document_type": doc.document_type,
            }
        except Exception:
            ocr_failed = True
            text = ""

        # Refine classification with LLM fallback if rule-based classification yielded general
        if final_doc_type == "general" and text.strip():
            refined_type = classify_document_llm(file.filename, text[:1000])
            if refined_type != "general":
                doc.document_type = refined_type
                doc.tags_json = json.dumps([refined_type])
                db.commit()

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
                    "document_type": doc.document_type,
                }
        else:
            chunks_to_store = chunk_text(text)
            print(f"\nCreated {len(chunks_to_store)} chunks")

            for i, chunk in enumerate(chunks_to_store):
                print(f"\n================ CHUNK {i} ================")
                print(chunk)

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
            "document_type": doc.document_type,
        }

    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))