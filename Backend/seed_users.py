from database import SessionLocal
from models import User
from passlib.hash import bcrypt

db = SessionLocal()

users = [
    {
        "email": "rg@gmail.com",
        "password": "admin123",
        "role": "admin",
        "name": "Management"
    },
    {
        "email": "sunilsharma@gmail.com",
        "password": "prof123",
        "role": "professor",
        "name": "Sunil Sharma"
    },
    {
        "email": "keshav@gmail.com",
        "password": "keshav123",
        "role": "student",
        "name": "Keshav"
    }
]

for u in users:
    existing = db.query(User).filter(User.email == u["email"]).first()
    if not existing:
        user = User(
            email=u["email"],
            password_hash=bcrypt.hash(u["password"]),  # 🔥 hashed
            role=u["role"],
            name=u["name"],
            is_active=True
        )
        db.add(user)

db.commit()
db.close()

print("✅ Users inserted")