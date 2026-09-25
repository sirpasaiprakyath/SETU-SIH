from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db
from models import User, AuditLog
from auth import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    username: str
    role: str
    full_name: str
    force: str
    rank: str
    battalion_id: str
    company: str
    personnel_id: str | None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify username and security clearance password."
        )

    # Encode role and sub into JWT token
    token_data = {
        "sub": user.username,
        "role": user.role,
        "full_name": user.full_name,
        "personnel_id": user.personnel_id
    }
    access_token = create_access_token(token_data)

    user_resp = UserResponse(
        username=user.username,
        role=user.role,
        full_name=user.full_name,
        force=user.force,
        rank=user.rank,
        battalion_id=user.battalion_id,
        company=user.company,
        personnel_id=user.personnel_id
    )

    # Record login session in audit log
    client_ip = request.client.host if request.client else "127.0.0.1"
    audit_entry = AuditLog(
        user_id=user.id,
        username=user.username,
        user_role=user.role,
        action="USER_LOGIN_SESSION",
        details=f"User {user.username} ({user.full_name}, {user.role}) authenticated active portal session.",
        ip_address=client_ip,
        timestamp=datetime.utcnow()
    )
    db.add(audit_entry)
    db.commit()

    return TokenResponse(access_token=access_token, user=user_resp)

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        username=current_user.username,
        role=current_user.role,
        full_name=current_user.full_name,
        force=current_user.force,
        rank=current_user.rank,
        battalion_id=current_user.battalion_id,
        company=current_user.company,
        personnel_id=current_user.personnel_id
    )
