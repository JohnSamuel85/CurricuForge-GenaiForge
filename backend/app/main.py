import os
from fastapi import FastAPI, Depends, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from backend.app.database import engine, Base
from backend.app.routes import auth, curriculum
from dotenv import load_dotenv

# Create SQLite DB Tables if they don't exist
Base.metadata.create_all(bind=engine)

load_dotenv()

app = FastAPI(title="CurricuForge API")

# Mount static files and templates
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
static_dir = os.path.join(project_root, "static")
templates_dir = os.path.join(project_root, "templates")

app.mount("/static", StaticFiles(directory=static_dir), name="static")
templates = Jinja2Templates(directory=templates_dir)

# API Routers
app.include_router(auth.router)
app.include_router(curriculum.router)

# HTML Page Routes (Frontend entrypoints)
@app.get("/", response_class=HTMLResponse)
async def read_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/login", response_class=HTMLResponse)
async def read_login(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/signup", response_class=HTMLResponse)
async def read_signup(request: Request):
    return templates.TemplateResponse("signup.html", {"request": request})

@app.get("/dashboard", response_class=HTMLResponse)
async def read_dashboard(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})

# Run with: uvicorn backend.app.main:app --reload
