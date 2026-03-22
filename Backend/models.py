from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


# ─────────────────────────────────────────────
# User Model
# ─────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id           = Column(Integer, primary_key=True, index=True)
    name         = Column(String, nullable=True)  # Optional name field
    department   = Column(String, nullable=True)
    email        = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role         = Column(String, default="student")   # student | admin | professor
    is_active    = Column(Boolean, default=True)
    created_at   = Column(DateTime, default=datetime.utcnow)

    # Relationships
    documents = relationship("Document", back_populates="student", cascade="all, delete-orphan")


# ─────────────────────────────────────────────
# Document Model
# ─────────────────────────────────────────────
class Document(Base):
    __tablename__ = "documents"

    id          = Column(Integer, primary_key=True, index=True)
    student_id  = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename    = Column(String, nullable=False)
    file_path   = Column(String, nullable=False)
    file_size   = Column(Integer, default=0)          # size in bytes
    file_type   = Column(String, default="")          # e.g. application/pdf
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("User", back_populates="documents")
    chunks  = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


# ─────────────────────────────────────────────
# DocumentChunk Model
# ─────────────────────────────────────────────
class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id          = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    chunk_text  = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    embedding   = Column(Text, nullable=True)   # stored as JSON string

    # Relationships
    document = relationship("Document", back_populates="chunks")


# ─────────────────────────────────────────────
# ChatMessage Model  (conversation memory)
# ─────────────────────────────────────────────
class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id         = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role       = Column(String, nullable=False)   # "user" | "assistant"
    content    = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("User", backref="messages")
