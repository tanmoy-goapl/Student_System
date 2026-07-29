import os
import shutil
import random
import string
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import User
from classroom_models import Classroom, StudentClass, ClassResource, ClassCurriculum
from services.extract import extract_text_from_pdf
from services.practice.base import _practice_llm_call
import json

router = APIRouter(prefix="/classroom", tags=["Classroom"])

def generate_class_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

class CreateClassRequest(BaseModel):
    name: str
    course_code: str
    professor_id: int

@router.post("/create")
def create_class(req: CreateClassRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == req.professor_id).first()
    if not user or user.role != "professor":
        raise HTTPException(status_code=403, detail="Only professors can create classes.")
    
    # Generate unique join code
    code = generate_class_code()
    while db.query(Classroom).filter(Classroom.code == code).first():
        code = generate_class_code()
        
    new_class = Classroom(
        name=req.name,
        code=code,
        course_code=req.course_code,
        professor_id=req.professor_id
    )
    db.add(new_class)
    db.commit()
    db.refresh(new_class)
    
    return {"success": True, "class_id": new_class.id, "code": new_class.code, "course_code": new_class.course_code, "name": new_class.name}


class JoinClassRequest(BaseModel):
    code: str
    student_id: int

@router.post("/join")
def join_class(req: JoinClassRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == req.student_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    classroom = db.query(Classroom).filter(Classroom.code == req.code.upper()).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Invalid class code")
        
    # Check if already joined
    existing = db.query(StudentClass).filter(
        StudentClass.student_id == req.student_id,
        StudentClass.class_id == classroom.id
    ).first()
    
    if existing:
        return {"success": True, "message": "Already joined this class", "class_id": classroom.id, "name": classroom.name}
        
    student_class = StudentClass(
        student_id=req.student_id,
        class_id=classroom.id
    )
    db.add(student_class)
    db.commit()
    
    return {"success": True, "class_id": classroom.id, "name": classroom.name}


@router.get("/my_classes/{user_id}")
def get_my_classes(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.role == "professor":
        classes = db.query(Classroom).filter(Classroom.professor_id == user_id).all()
        return {
            "success": True,
            "role": "professor",
            "classes": [
                {
                    "id": c.id,
                    "name": c.name,
                    "code": c.code,
                    "course_code": c.course_code,
                    "created_at": c.created_at,
                    "student_count": len(c.students)
                } for c in classes
            ]
        }
    else:
        student_classes = db.query(StudentClass).filter(StudentClass.student_id == user_id).all()
        return {
            "success": True,
            "role": "student",
            "classes": [
                {
                    "id": sc.classroom.id,
                    "name": sc.classroom.name,
                    "code": sc.classroom.code,
                    "course_code": sc.classroom.course_code,
                    "professor_name": sc.classroom.professor.name,
                    "joined_at": sc.joined_at
                } for sc in student_classes
            ]
        }


# ==========================================
# CLASS DETAILS & RESOURCES
# ==========================================

@router.get("/{class_id}")
def get_class_details(class_id: int, user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    classroom = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
        
    # Check access
    if user.role == "professor":
        if classroom.professor_id != user_id:
            raise HTTPException(status_code=403, detail="Not your class")
    elif user.role == "student":
        student_in_class = db.query(StudentClass).filter(
            StudentClass.class_id == class_id,
            StudentClass.student_id == user_id
        ).first()
        if not student_in_class:
            raise HTTPException(status_code=403, detail="Not enrolled in this class")
    else:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    return {
        "success": True,
        "class_id": classroom.id,
        "name": classroom.name,
        "code": classroom.code,
        "professor_name": classroom.professor.name or "Professor",
        "student_count": len(classroom.students),
        "created_at": classroom.created_at
    }


UPLOAD_DIR = "uploads/classroom"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/{class_id}/resources/upload")
def upload_class_resource(
    class_id: int,
    title: str = Form(...),
    type: str = Form(...),
    user_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role != "professor":
        raise HTTPException(status_code=403, detail="Only professors can upload resources.")
        
    classroom = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not classroom or classroom.professor_id != user_id:
        raise HTTPException(status_code=403, detail="Not your class")
        
    # Save file
    safe_filename = f"{class_id}_{random.randint(1000,9999)}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # DB entry
    resource = ClassResource(
        class_id=class_id,
        title=title,
        type=type,
        file_path=file_path,
        uploaded_by=user_id
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)
    
    return {"success": True, "resource": {"id": resource.id, "title": resource.title, "type": resource.type}}


@router.get("/{class_id}/resources")
def get_class_resources(class_id: int, user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    classroom = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
        
    # Check access
    if user.role == "professor":
        if classroom.professor_id != user_id:
            raise HTTPException(status_code=403, detail="Not your class")
    elif user.role == "student":
        student_in_class = db.query(StudentClass).filter(
            StudentClass.class_id == class_id,
            StudentClass.student_id == user_id
        ).first()
        if not student_in_class:
            raise HTTPException(status_code=403, detail="Not enrolled in this class")
            
    resources = db.query(ClassResource).filter(ClassResource.class_id == class_id).order_by(ClassResource.uploaded_at.desc()).all()
    
    return {
        "success": True,
        "resources": [
            {
                "id": r.id,
                "title": r.title,
                "type": r.type,
                "uploaded_at": r.uploaded_at,
                "uploaded_by_name": r.uploader.name or "Professor"
            } for r in resources
        ]
    }


@router.delete("/resource/{resource_id}")
def delete_class_resource(resource_id: int, user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role != "professor":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    resource = db.query(ClassResource).filter(ClassResource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
        
    # Must own the class
    classroom = db.query(Classroom).filter(Classroom.id == resource.class_id).first()
    if classroom.professor_id != user_id:
        raise HTTPException(status_code=403, detail="Not your class")
        
    # Delete physical file
    if os.path.exists(resource.file_path):
        os.remove(resource.file_path)
        
    # Delete DB entry
    db.delete(resource)
    db.commit()
    
    return {"success": True, "message": "Resource deleted"}


@router.delete("/delete-classroom/{class_id}")
def delete_classroom(class_id: int, user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role != "professor":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    classroom = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
        
    if classroom.professor_id != user_id:
        raise HTTPException(status_code=403, detail="Not your classroom")
        
    # Delete associated files physically
    for resource in classroom.resources:
        if os.path.exists(resource.file_path):
            try:
                os.remove(resource.file_path)
            except Exception as e:
                pass
                
    db.delete(classroom)
    db.commit()
    
    return {"success": True, "message": "Classroom deleted successfully"}


@router.get("/resource/download/{resource_id}")
def download_class_resource(resource_id: int, user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    resource = db.query(ClassResource).filter(ClassResource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
        
    # Check access
    classroom = db.query(Classroom).filter(Classroom.id == resource.class_id).first()
    if user.role == "professor" and classroom.professor_id != user_id:
        raise HTTPException(status_code=403, detail="Not your class")
    elif user.role == "student":
        student_in_class = db.query(StudentClass).filter(
            StudentClass.class_id == classroom.id,
            StudentClass.student_id == user_id
        ).first()
        if not student_in_class:
            raise HTTPException(status_code=403, detail="Not enrolled in this class")
            
    if not os.path.exists(resource.file_path):
        raise HTTPException(status_code=404, detail="File missing on disk")
        
    # Just serve it
    filename = resource.file_path.split("/")[-1]
    # Remove the random prefix to make it look clean if possible, or just send the file
    # file_path has format: {class_id}_{random}_{actual_filename}
    parts = filename.split("_", 2)
    display_filename = parts[2] if len(parts) >= 3 else filename
    
    return FileResponse(path=resource.file_path, filename=display_filename)

# ==========================================
# CLASS CURRICULUM
# ==========================================

CURRICULUM_PROMPT = """You are an expert curriculum extractor.
Extract the curriculum structure from the following syllabus text.
Identify the overarching subject name, and break the curriculum down into units and topics.
Output STRICT JSON with the exact following schema:
{
  "subject_name": "Name of the Subject",
  "units": [
    {
      "title": "Unit 1: Introduction",
      "topics": ["Topic 1", "Topic 2"]
    }
  ]
}
Do NOT output any markdown blocks like ```json, just output the raw JSON string. Do not include any conversational text.
"""

def _clean_json_response(text: str) -> str:
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()

@router.post("/{class_id}/upload_curriculum")
def upload_curriculum(
    class_id: int,
    user_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role != "professor":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    classroom = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not classroom or classroom.professor_id != user_id:
        raise HTTPException(status_code=403, detail="Not your class")
        
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".txt", ".docx", ".doc"]:
        ext = ".txt" # fallback
    safe_filename = f"curriculum_{class_id}_{random.randint(1000,9999)}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Extract text
    try:
        from services.extract import extract_text
        extracted_text = extract_text(file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {str(e)}")
        
    # Send to LLM
    try:
        llm_response = _practice_llm_call(CURRICULUM_PROMPT, extracted_text)
        cleaned_json = _clean_json_response(llm_response)
        parsed_curriculum = json.loads(cleaned_json)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM generation failed: {str(e)}")
        
    subject_name = parsed_curriculum.get("subject_name", classroom.name)
    
    # Save to DB
    curr = db.query(ClassCurriculum).filter(ClassCurriculum.class_id == class_id).first()
    if not curr:
        curr = ClassCurriculum(class_id=class_id)
        db.add(curr)
        
    curr.extracted_text = extracted_text
    curr.curriculum_json = parsed_curriculum
    curr.subject_name = subject_name
    db.commit()
    
    return {"success": True, "curriculum": parsed_curriculum}


@router.post("/{class_id}/regenerate_curriculum")
def regenerate_curriculum(class_id: int, req: dict, db: Session = Depends(get_db)):
    user_id = req.get("user_id")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role != "professor":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    curr = db.query(ClassCurriculum).filter(ClassCurriculum.class_id == class_id).first()
    if not curr or not curr.extracted_text:
        raise HTTPException(status_code=400, detail="No extracted text found. Please upload syllabus first.")
        
    # Send to LLM
    try:
        llm_response = _practice_llm_call(CURRICULUM_PROMPT, curr.extracted_text)
        cleaned_json = _clean_json_response(llm_response)
        parsed_curriculum = json.loads(cleaned_json)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM generation failed: {str(e)}")
        
    curr.curriculum_json = parsed_curriculum
    curr.subject_name = parsed_curriculum.get("subject_name", curr.subject_name)
    db.commit()
    
    return {"success": True, "curriculum": parsed_curriculum}


@router.get("/{class_id}/curriculum")
def get_curriculum(class_id: int, user_id: int, db: Session = Depends(get_db)):
    curr = db.query(ClassCurriculum).filter(ClassCurriculum.class_id == class_id).first()
    if not curr:
        return {"success": True, "curriculum": None}
    return {"success": True, "curriculum": curr.curriculum_json, "subject_name": curr.subject_name}


@router.put("/{class_id}/curriculum")
def update_curriculum(class_id: int, req: dict, db: Session = Depends(get_db)):
    user_id = req.get("user_id")
    curriculum_data = req.get("curriculum")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role != "professor":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    curr = db.query(ClassCurriculum).filter(ClassCurriculum.class_id == class_id).first()
    if not curr:
        curr = ClassCurriculum(class_id=class_id)
        db.add(curr)
        
    curr.curriculum_json = curriculum_data
    if "subject_name" in curriculum_data:
        curr.subject_name = curriculum_data["subject_name"]
    db.commit()
    
    return {"success": True, "curriculum": curr.curriculum_json}
