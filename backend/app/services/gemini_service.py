import os
import json
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from typing import List

# Define Pydantic models for the structured JSON response
class WeekPlan(BaseModel):
    week: int = Field(description="Week number")
    focus: str = Field(description="Main focus for this week")
    topics: List[str] = Field(description="Specific topics to cover")
    estimated_hours: int = Field(description="Estimated hours of effort required")
    resources: List[str] = Field(description="Recommended resources (links, books, or platforms)")

class RoadmapResponse(BaseModel):
    timeline_weeks: int = Field(description="Total weeks for the roadmap")
    weekly_breakdown: List[WeekPlan] = Field(description="Week-by-week learning plan")
    required_skills: List[str] = Field(description="Essential skills needed for the target role")
    skill_gap_analysis: List[str] = Field(description="List of skill gaps comparing current skills to target role requirements")
    suggested_projects: List[str] = Field(description="Suggested projects to build portfolio")
    certifications: List[str] = Field(description="Recommended certifications or credentials")
    resume_improvement_suggestions: List[str] = Field(description="Tips to improve the user's resume for the target role")

def generate_learning_path(user_inputs: dict, resume_text: str = "") -> dict:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is missing.")

    client = genai.Client(api_key=api_key)

    prompt = (
        f"You are an expert career counselor and AI learning path generator. "
        f"Generate a highly structured and personalized learning roadmap based on the following information.\n\n"
        f"Current Skills: {user_inputs.get('skills', 'None specified')}\n"
        f"Target Domain: {user_inputs.get('domain', 'None specified')}\n"
        f"Target Role: {user_inputs.get('role', 'None specified')}\n"
        f"Time Availability: {user_inputs.get('time', 'None specified')} hours/week\n"
        f"Learning Pace: {user_inputs.get('pace', 'Normal')}\n"
    )

    if resume_text:
        prompt += f"\nResume Text Extract:\n{resume_text[:3000]}\n"

    prompt += (
        "\nIMPORTANT LOGIC: The `timeline_weeks` MUST be calculated realistically. Take the total `estimated_hours` across all weeks and ensure they align with the user's `Time Availability` per week.\n"
        "\nProvide a structured JSON output strictly matching this format:\n"
        "{\n"
        "  \"timeline_weeks\": integer,\n"
        "  \"weekly_breakdown\": [\n"
        "    {\n"
        "      \"week\": integer,\n"
        "      \"focus\": string,\n"
        "      \"topics\": [string, ...],\n"
        "      \"estimated_hours\": integer,\n"
        "      \"resources\": [string, ...]\n"
        "    }\n"
        "  ],\n"
        "  \"required_skills\": [string, ...],\n"
        "  \"skill_gap_analysis\": [string, ...],\n"
        "  \"suggested_projects\": [string, ...],\n"
        "  \"certifications\": [string, ...],\n"
        "  \"resume_improvement_suggestions\": [string, ...]\n"
        "}"
    )

    # Note: Using gemini-2.5-flash-lite as requested
    response = client.models.generate_content(
        model="gemini-2.5-flash", 
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.2,
        ),
    )

    # The response.text is guaranteed to be a JSON string conforming to RoadmapResponse schema
    return json.loads(response.text)
