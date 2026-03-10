from sqlalchemy import Column, Integer, String, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True) # Nullable if google oauth
    google_id = Column(String, nullable=True) # Optional OAuth implementation
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    curriculums = relationship("Curriculum", back_populates="user")

class Curriculum(Base):
    __tablename__ = "curriculums"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Nullable for guest
    input_json = Column(JSON, nullable=False)
    output_json = Column(JSON, nullable=False)
    resume_filename = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="curriculums")
