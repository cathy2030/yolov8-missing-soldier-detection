import logging
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .database import Base, engine
from .routers import auth, sites, sessions, events, dashboard, uploads

logging.basicConfig(level=logging.INFO)
settings = get_settings()

# For a scaffold we create tables on startup. For production, switch to Alembic migrations.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Parade Ground Missing-Soldier Monitor", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth.router, sites.router, sessions.router, events.router, dashboard.router, uploads.router):
    app.include_router(r)


EVIDENCE_DIR = os.getenv("EVIDENCE_DIR", "data/evidence")
os.makedirs(EVIDENCE_DIR, exist_ok=True)
app.mount("/evidence", StaticFiles(directory=EVIDENCE_DIR), name="evidence")


@app.get("/health")
def health():
    return {"status": "ok"}

