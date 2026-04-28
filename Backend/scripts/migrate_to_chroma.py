# migrate_to_chroma.py

import os
import sys

CURRENT_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
    
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Document
from services.extract import extract_text, chunk_text
from chroma_store import upsert_chunks


def migrate():
    db: Session = SessionLocal()

    docs = db.query(Document).all()

    for doc in docs:
        print(f"Processing {doc.filename}...")

        try:
            text = extract_text(doc.file_path)

            if not text.strip():
                print("No text, skipping")
                continue

            chunks = chunk_text(text)

            upsert_chunks(doc.id, chunks)

            print(f"✅ Migrated {len(chunks)} chunks")

        except Exception as e:
            print(f"❌ Failed: {e}")

    db.close()


if __name__ == "__main__":
    migrate()