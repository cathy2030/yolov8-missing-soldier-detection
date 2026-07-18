import logging
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .database import Base, engine
from .routers import auth, sites, sessions, events, dashboard, uploads
from fastapi import HTTPException


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



@app.get("/setup/{secret}")
def setup_admin(secret: str):
    # one-time admin bootstrap; remove after use
    if secret != os.getenv("SETUP_SECRET", ""):
        raise HTTPException(status_code=403, detail="Forbidden")
    from app.database import SessionLocal
    from app.security import hash_password
    from app import models
    db = SessionLocal()
    try:
        email = os.getenv("ADMIN_EMAIL", "admin@parade.local")
        existing = db.query(models.User).filter_by(email=email).first()
        if existing:
            existing.hashed_password = hash_password(os.getenv("ADMIN_PASSWORD", ""))
            db.commit()
            return {"status": "admin password reset", "email": email}
        db.add(models.User(
            email=email,
            full_name=os.getenv("ADMIN_FULL_NAME", "Administrator"),
            hashed_password=hash_password(os.getenv("ADMIN_PASSWORD", "")),
            role="admin",
        ))
        db.commit()
        return {"status": "admin created", "email": email}
    finally:
        db.close()
        
        