#!/usr/bin/env python3
"""Update users without names to have names extracted from their email."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import User

def extract_name_from_email(email: str) -> str:
    """Extract a readable name from email address."""
    # Get the part before @
    local_part = email.split("@")[0]
    # Replace dots and underscores with spaces, then title case
    name = local_part.replace(".", " ").replace("_", " ")
    # Capitalize first letter of each word
    name = " ".join(word.capitalize() for word in name.split())
    return name

def update_user_names():
    """Update all users without names."""
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.name == None).all()
        if not users:
            print("✅ All users already have names")
            return
        
        updated = 0
        for user in users:
            user.name = extract_name_from_email(user.email)
            updated += 1
            print(f"   Updated {user.email} -> {user.name}")
        
        db.commit()
        print(f"✅ Updated {updated} user(s) with names")
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_user_names()
