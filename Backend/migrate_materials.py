from database import SessionLocal
from models import Document
from classroom_models import ClassResource
import os

db = SessionLocal()
try:
    # Find all documents with name starting with 'AI Study Material'
    docs = db.query(Document).filter(Document.filename.like("AI Study Material%")).all()
    print(f"Found {len(docs)} AI Study Materials")
    for doc in docs:
        old_path = doc.file_path
        if old_path and old_path.endswith(".pdf"):
            new_path = old_path[:-4] + ".md"
            new_filename = doc.filename[:-4] + ".md"
            
            print(f"Updating doc {doc.id}: {doc.filename} -> {new_filename}")
            
            # Rename physical file if it exists
            if os.path.exists(old_path):
                os.rename(old_path, new_path)
                print(f"  Renamed physical file: {old_path} -> {new_path}")
            
            doc.file_path = new_path
            doc.filename = new_filename
            doc.document_format = "MD"
            
            # Also update ClassResource entries
            resources = db.query(ClassResource).filter(ClassResource.file_path == old_path).all()
            for res in resources:
                res.file_path = new_path
                print(f"  Updated ClassResource {res.id}")
                
    db.commit()
    print("Database correction completed successfully!")
except Exception as e:
    db.rollback()
    print(f"Error: {e}")
finally:
    db.close()
