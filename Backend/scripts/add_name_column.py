#!/usr/bin/env python3
"""Add name column to users table if it doesn't exist."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, SessionLocal
from sqlalchemy import text

def add_name_column():
    """Add name column to users table if it doesn't exist."""
    db = SessionLocal()
    try:
        # Check if column exists (PostgreSQL)
        if "postgresql" in str(engine.url):
            result = db.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='users' AND column_name='name'
            """))
            if result.fetchone():
                print("✅ Column 'name' already exists in users table")
                return
        
        # Check if column exists (SQLite)
        elif "sqlite" in str(engine.url):
            result = db.execute(text("PRAGMA table_info(users)"))
            columns = [row[1] for row in result.fetchall()]
            if "name" in columns:
                print("✅ Column 'name' already exists in users table")
                return
        
        # Add the column
        print("Adding 'name' column to users table...")
        db.execute(text("ALTER TABLE users ADD COLUMN name VARCHAR"))
        db.commit()
        print("✅ Column 'name' added successfully")
        
    except Exception as e:
        print(f"⚠️  Error: {e}")
        db.rollback()
        # If column already exists, that's fine
        if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
            print("✅ Column 'name' already exists")
    finally:
        db.close()

if __name__ == "__main__":
    add_name_column()
