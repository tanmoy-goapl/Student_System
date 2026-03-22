from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from database import get_db
from models import User
import bcrypt

router = APIRouter()

# ── Helpers ───────────────────────────────────────────────

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

# ── Schemas ───────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    user_id: int
    role: str
    message: str = "Success"

class CreateUserRequest(BaseModel):
    """Payload for admin-created users."""
    admin_id: int          # who is performing the action
    name: str | None = None  # Optional name field
    department: str | None = None
    email: EmailStr
    password: str
    role: str = "student"  # default new users to student

class UserOut(BaseModel):
    id: int
    name: str | None = None
    department: str | None = None
    email: EmailStr
    role: str
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True

# ── Routes ────────────────────────────────────────────────

@router.post("/login", response_model=AuthResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid email or password")
    return AuthResponse(user_id=user.id, role=user.role, message="Login successful")


@router.post("/register", response_model=AuthResponse)
def register(credentials: LoginRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == credentials.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Email already registered")
    user = User(email=credentials.email,
                password_hash=hash_password(credentials.password),
                role="student")
    db.add(user)
    db.commit()
    db.refresh(user)
    return AuthResponse(user_id=user.id, role=user.role, message="Registration successful")


@router.post("/admin/users", response_model=AuthResponse)
def admin_create_user(payload: CreateUserRequest, db: Session = Depends(get_db)):
    """
    Create a new user (student or admin) — only allowed for admin accounts.

    Flow:
    - admin logs in via /login and gets their user_id + role
    - frontend calls this endpoint with admin_id from that login response
    """
    # 1) Verify that the caller is an admin
    admin = db.query(User).filter(User.id == payload.admin_id).first()
    if not admin or admin.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create users.",
        )

    # 2) Prevent duplicate emails
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # 3) Create the new user
    new_role = payload.role if payload.role in {"student", "admin"} else "student"
    user = User(
        name=payload.name,
        department=payload.department,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=new_role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return AuthResponse(
        user_id=user.id,
        role=user.role,
        message="User created successfully",
    )


@router.get("/admin/users", response_model=list[UserOut])
def admin_list_users(admin_id: int, db: Session = Depends(get_db)):
    """
    Return all users in the system — only for admins.
    admin_id is passed as a query parameter and is used to verify permissions.
    """
    admin = db.query(User).filter(User.id == admin_id).first()
    if not admin or admin.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view users.",
        )

    users = db.query(User).order_by(User.created_at.asc()).all()
    return [
        UserOut(
            id=u.id,
            name=u.name,
            department=u.department,
            email=u.email,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at.isoformat() if u.created_at else "",
        )
        for u in users
    ]


@router.delete("/admin/users/{user_id}")
def admin_delete_user(user_id: int, admin_id: int, db: Session = Depends(get_db)):
    """
    Delete a user by ID — only for admins.
    admin_id is passed as query param; prevents non-admins from deleting.
    """
    admin = db.query(User).filter(User.id == admin_id).first()
    if not admin or admin.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete users.",
        )

    # Optional: prevent admin from deleting themselves
    if user_id == admin_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own admin account.",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        # Make delete idempotent: if user is already gone, still return 200
        return {"message": "User already deleted or not found"}

    db.delete(user)
    db.commit()
    return {"message": f"User {user.email} deleted"}
