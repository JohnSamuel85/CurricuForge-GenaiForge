from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class CurriculumBase(BaseModel):
    input_json: Dict[str, Any]
    output_json: Dict[str, Any]
    resume_filename: Optional[str] = None

class CurriculumCreate(CurriculumBase):
    pass

class CurriculumResponse(CurriculumBase):
    id: int
    user_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

class RoadmapRequest(BaseModel):
    skills: str
    domain: str
    role: str
    time: str
    pace: str = "Normal"
