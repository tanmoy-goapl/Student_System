from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Classroom(Base):
    __tablename__ = "classrooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, index=True, nullable=False)
    course_code = Column(String, nullable=True)
    department = Column(String, nullable=True)
    professor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    professor = relationship("User", back_populates="created_classes")
    students = relationship("StudentClass", back_populates="classroom", cascade="all, delete-orphan")
    resources = relationship("ClassResource", back_populates="classroom", cascade="all, delete-orphan")
    curriculum = relationship("ClassCurriculum", back_populates="classroom", uselist=False, cascade="all, delete-orphan")


class StudentClass(Base):
    __tablename__ = "student_classes"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    class_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("User", back_populates="joined_classes")
    classroom = relationship("Classroom", back_populates="students")


class ClassResource(Base):
    __tablename__ = "class_resources"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)
    title = Column(String, nullable=False)
    type = Column(String, nullable=False) # 'syllabus', 'notes', 'assignment', 'pyq'
    file_path = Column(String, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    classroom = relationship("Classroom", back_populates="resources")
    uploader = relationship("User")


class ClassCurriculum(Base):
    __tablename__ = "class_curriculums"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False, unique=True)
    subject_name = Column(String, nullable=True)
    extracted_text = Column(String, nullable=True)
    curriculum_json = Column(JSON, nullable=True)
    generated_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    classroom = relationship("Classroom", back_populates="curriculum")
