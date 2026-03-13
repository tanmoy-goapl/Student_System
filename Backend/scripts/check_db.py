#!/usr/bin/env python3
"""Check database tables and data."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, SessionLocal
from models import User, Document, DocumentChunk
from sqlalchemy import inspect

def check():
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    print("=" * 50)
    print("DATABASE CHECK")
    print("=" * 50)
    print(f"\n📊 Tables ({len(tables)}): {', '.join(tables)}")

    db = SessionLocal()
    try:
        users     = db.query(User).all()
        docs      = db.query(Document).count()
        chunks    = db.query(DocumentChunk).count()

        print(f"\n👥 Users    : {len(users)}")
        for u in users:
            print(f"   [{u.id}] {u.email} ({u.role})")

        print(f"\n📄 Documents: {docs}")
        print(f"📝 Chunks   : {chunks}")
        print("\n✅ All good!")
    finally:
        db.close()

if __name__ == "__main__":
    check()
