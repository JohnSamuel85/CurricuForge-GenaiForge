from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional, List
import traceback

from backend.app.database import get_db
from backend.app.models.models import User, Curriculum
from backend.app.schemas.schemas import CurriculumResponse
from backend.app.auth.jwt_handler import get_current_user_optional

from backend.app.services.resume_parser import extract_resume_text
from backend.app.services.gemini_service import generate_learning_path

router = APIRouter(prefix="/api/curriculum", tags=["curriculum"])

@router.post("/generate", response_model=CurriculumResponse)
async def generate_curriculum(
    skills: str = Form(...),
    domain: str = Form(...),
    role: str = Form(...),
    time: str = Form(...),
    pace: str = Form("Normal"),
    resume: Optional[UploadFile] = File(None),
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    try:
        user_inputs = {
            'skills': skills,
            'domain': domain,
            'role': role,
            'time': time,
            'pace': pace
        }

        resume_text = ""
        resume_filename = None
        
        # Handle file upload if present
        if resume and resume.filename != '':
            try:
                # Flask FileStorage -> FastAPI UploadFile mapping
                # Read the file data into bytes
                file_bytes = await resume.read()
                
                # Mock a stream object compatible with our existing parser
                class FastAPIMockStorage:
                    def __init__(self, filename, content):
                        self.filename = filename
                        self.content = content
                    
                    def read(self):
                        return self.content
                    
                    def seek(self, pos):
                        pass

                mock_storage = FastAPIMockStorage(resume.filename, file_bytes)
                resume_text = extract_resume_text(mock_storage)
                resume_filename = resume.filename
            except Exception as e:
                print(f"Error parsing resume: {e}")

        # Generate learning path via Gemini
        # We do not modify the existing service logic
        roadmap_json = generate_learning_path(user_inputs, resume_text)

        # Create un-persisted Curriculum object
        new_curriculum = Curriculum(
            user_id=current_user.id if current_user else None,
            input_json=user_inputs,
            output_json=roadmap_json,
            resume_filename=resume_filename
        )

        # Persist if user is logged in
        if current_user:
            db.add(new_curriculum)
            db.commit()
            db.refresh(new_curriculum)
        else:
            # We must assign a fake ID & created_at for response model if guest
            from datetime import datetime, timezone
            new_curriculum.id = 0
            new_curriculum.created_at = datetime.now(timezone.utc)

        return new_curriculum

    except ValueError as ve:
        raise HTTPException(status_code=500, detail=str(ve))
    except Exception as e:
        trace = traceback.format_exc()
        print(f"Error in backend: {trace}")
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {str(e)}")


@router.get("/my-curriculums", response_model=List[CurriculumResponse])
def get_my_curriculums(
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    curriculums = db.query(Curriculum).filter(Curriculum.user_id == current_user.id).order_by(Curriculum.created_at.desc()).all()
    return curriculums
