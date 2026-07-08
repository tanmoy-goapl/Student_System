#!/usr/bin/env python3
"""Initialize the database and create default users."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import init_db, SessionLocal
from models import User
import bcrypt

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def create_default_users():
    db = SessionLocal()
    try:
        # Ensure default student exists (and reset password)
        student = db.query(User).filter(User.email == "keshav@gmail.com").first()
        if not student:
            # Let's also check if student@gmail.com exists and update it instead of creating duplicate
            old_student = db.query(User).filter(User.email == "student@gmail.com").first()
            if old_student:
                old_student.email = "keshav@gmail.com"
                old_student.password_hash = hash_password("keshav123")
                old_student.name = "Keshav"
                student = old_student
                print("✅ Updated existing student to Keshav.")
            else:
                student = User(
                    name="Keshav",
                    email="keshav@gmail.com",
                    password_hash=hash_password("keshav123"),
                    role="student",
                )
                db.add(student)
                print("✅ Created default student user Keshav.")
        else:
            student.password_hash = hash_password("keshav123")
            student.role = "student"
            if not student.name or student.name == "Student User":
                student.name = "Keshav"
            print("✅ Reset student password to keshav123.")
        
        # Ensure default admin exists (and reset password)
        admin = db.query(User).filter(User.email == "admin@example.com").first()
        if not admin:
            admin = User(
                name="Admin User",
                email="admin@example.com",
                password_hash=hash_password("admin123"),
                role="admin",
            )
            db.add(admin)
            print("✅ Created default admin user.")
        else:
            admin.password_hash = hash_password("admin123")
            admin.role = "admin"
            if not admin.name:
                admin.name = "Admin User"
            print("✅ Reset admin password to admin123.")

        db.commit()
        print("Default logins:")
        print("   keshav@gmail.com    / keshav123")
        print("   admin@example.com   / admin123")
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Initializing database...")
    init_db()
    print("✅ Tables created")
    create_default_users()
