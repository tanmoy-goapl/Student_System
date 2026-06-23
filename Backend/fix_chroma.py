import os
from database import SessionLocal
from models import Document
from services.extract import extract_text, chunk_text
from chroma_store import upsert_chunks

def run():
    db = SessionLocal()
    docs = db.query(Document).all()
    print(f"Found {len(docs)} documents in Postgres.")
    for doc in docs:
        print(f"Processing doc {doc.id}: {doc.filename}")
        if os.path.exists(doc.file_path):
            try:
                text = extract_text(doc.file_path)
                if text.strip():
                    chunks = chunk_text(text)
                    upsert_chunks(doc.id, chunks)
                    print(f"  -> Inserted {len(chunks)} chunks.")
                else:
                    print("  -> No text extracted.")
            except Exception as e:
                print(f"  -> Error: {e}")
        else:
            print("  -> File not found on disk.")
    db.close()

if __name__ == "__main__":
    run()
