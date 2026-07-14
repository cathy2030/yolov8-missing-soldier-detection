from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import get_current_user
from .. import models, schemas

router = APIRouter(prefix="/api", tags=["sessions"], dependencies=[Depends(get_current_user)])


@router.post("/sessions", response_model=schemas.SessionOut, status_code=201)
def start_session(payload: schemas.SessionCreate, db: Session = Depends(get_db),
                  current: models.User = Depends(get_current_user)):
    if not db.get(models.Site, payload.site_id):
        raise HTTPException(status_code=404, detail="Site not found")
    sess = models.ParadeSession(**payload.model_dump(), started_by=current.id)
    db.add(sess); db.commit(); db.refresh(sess)
    return sess


@router.get("/sessions", response_model=list[schemas.SessionOut])
def list_sessions(db: Session = Depends(get_db)):
    return db.query(models.ParadeSession).order_by(models.ParadeSession.id.desc()).all()


@router.get("/sessions/active", response_model=list[schemas.SessionOut])
def active_sessions(db: Session = Depends(get_db)):
    return db.query(models.ParadeSession).filter(models.ParadeSession.status == "active").all()


@router.get("/sessions/{session_id}", response_model=schemas.SessionOut)
def get_session(session_id: int, db: Session = Depends(get_db)):
    sess = db.get(models.ParadeSession, session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    return sess


@router.post("/sessions/{session_id}/end", response_model=schemas.SessionOut)
def end_session(session_id: int, db: Session = Depends(get_db)):
    sess = db.get(models.ParadeSession, session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    sess.status = "ended"
    sess.ended_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(sess)
    return sess


@router.patch("/sessions/{session_id}", response_model=schemas.SessionOut)
def update_session(session_id: int, payload: schemas.SessionUpdate, db: Session = Depends(get_db)):
    sess = db.get(models.ParadeSession, session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    if payload.name is not None:
        sess.name = payload.name
    if payload.expected_count is not None:
        if payload.expected_count < 0:
            raise HTTPException(status_code=400, detail="Expected count cannot be negative")
        sess.expected_count = payload.expected_count
    db.commit(); db.refresh(sess)
    return sess


