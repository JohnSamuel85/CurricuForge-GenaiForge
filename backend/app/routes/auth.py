from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.app.database import get_db
from backend.app.models.models import User
from backend.app.schemas.schemas import UserCreate, UserResponse, Token
from backend.app.auth.jwt_handler import get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user_optional
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta

router = APIRouter(prefix="/api/auth", tags=["auth"])

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class FeedbackRequest(BaseModel):
    message: str
    rating: int = 5

@router.post("/signup", response_model=UserResponse)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    try:
        db_user = db.query(User).filter(User.email == user.email).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        hashed_pass = get_password_hash(user.password)
        new_user = User(email=user.email, password_hash=hashed_pass)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(error_msg)
        raise HTTPException(status_code=500, detail=f"Signup failed: {str(e)}\n{error_msg}")

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not user.password_hash or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User | None = Depends(get_current_user_optional)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return current_user

@router.put("/change-password")
def change_password(
    body: ChangePasswordRequest,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password_hash = get_password_hash(body.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@router.post("/feedback")
def submit_feedback(
    body: FeedbackRequest,
    current_user: User | None = Depends(get_current_user_optional)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    # Log feedback (in production this would be stored in DB or sent via email)
    print(f"Feedback from {current_user.email} (rating: {body.rating}/5): {body.message}")
    return {"message": "Feedback received. Thank you!"}
