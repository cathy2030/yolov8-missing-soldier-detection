import base64
import os
from datetime import datetime, timezone, date
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import get_current_user, require_runner_key
from ..services.alerts import dispatch_alert
from ..services.alert_format import build_alert
from .. import models, schemas

router = APIRouter(prefix="/api", tags=["events"])

EVIDENCE_DIR = os.getenv("EVIDENCE_DIR", "data/evidence")
os.makedirs(EVIDENCE_DIR, exist_ok=True)


def _save_evidence(session_id: int, image_base64: str) -> str | None:
    try:
        raw = base64.b64decode(image_base64)
        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
        path = os.path.join(EVIDENCE_DIR, f"session{session_id}_{ts}.jpg")
        with open(path, "wb") as fh:
            fh.write(raw)
        return path
    except Exception:  # noqa: BLE001
        return None


def _send_alert(alert_id: int, session_id: int, missing: int, detected: int, expected: int, when):
    """Runs in a background task so the ingest request returns immediately."""
    from ..database import SessionLocal
    db = SessionLocal()
    try:
        sess = db.get(models.ParadeSession, session_id)
        site = db.get(models.Site, sess.site_id) if sess else None
        subject, email_body, tg_html = build_alert(
            muster_name=sess.name if sess else "Muster",
            site_name=site.name if site else "Unknown site",
            detected=detected, expected=expected, missing=missing, when=when)
        channels = dispatch_alert(subject, email_body, tg_html)
        alert = db.get(models.Alert, alert_id)
        if alert:
            alert.message = email_body
            alert.channels = channels
            alert.delivered = bool(channels)
            db.commit()
    finally:
        db.close()


@router.post("/events/ingest", response_model=schemas.EventOut, status_code=201)
def ingest_event(payload: schemas.EventIngest, background: BackgroundTasks,
                 db: Session = Depends(get_db), _: bool = Depends(require_runner_key)):
    """Called by the edge runner for each processed frame (or on a throttled cadence)."""
    sess = db.get(models.ParadeSession, payload.session_id)
    if not sess or sess.status != "active":
        raise HTTPException(status_code=404, detail="Active session not found")

    expected = payload.expected_count if payload.expected_count is not None else sess.expected_count
    missing = max(0, expected - payload.detected_count)
    status_str = "MISSING" if missing > 0 else "COMPLETE"

    image_path = _save_evidence(sess.id, payload.image_base64) if payload.image_base64 else None

    event = models.AttendanceEvent(
        session_id=sess.id, detected_count=payload.detected_count, expected_count=expected,
        missing_count=missing, status=status_str, image_path=image_path,
    )
    db.add(event); db.commit(); db.refresh(event)

    if status_str == "MISSING":
        message = (f"ALERT: {missing} soldier(s) missing - {event.detected_count}/{expected} present "
                   f"({sess.name})")
        alert = models.Alert(session_id=sess.id, event_id=event.id, missing_count=missing, message=message)
        db.add(alert); db.commit(); db.refresh(alert)
        background.add_task(_send_alert, alert.id, sess.id, missing, event.detected_count, expected, event.created_at)

    return event


@router.get("/events", response_model=list[schemas.EventOut], dependencies=[Depends(get_current_user)])
def list_events(session_id: int | None = None, limit: int = 100, db: Session = Depends(get_db)):
    q = db.query(models.AttendanceEvent)
    if session_id is not None:
        q = q.filter(models.AttendanceEvent.session_id == session_id)
    rows = q.order_by(models.AttendanceEvent.id.desc()).limit(min(limit, 500)).all()
    out = []
    for e in rows:
        item = schemas.EventOut.model_validate(e)
        if e.image_path:
            item.image_url = "/evidence/" + os.path.basename(e.image_path)
        out.append(item)
    return out


@router.get("/alerts", response_model=list[schemas.AlertOut], dependencies=[Depends(get_current_user)])
def list_alerts(limit: int = 100, db: Session = Depends(get_db)):
    rows = db.query(models.Alert).order_by(models.Alert.id.desc()).limit(min(limit, 500)).all()
    out = []
    for a in rows:
        item = schemas.AlertOut.model_validate(a)
        ev = db.get(models.AttendanceEvent, a.event_id)
        if ev and ev.image_path:
            item.image_url = "/evidence/" + os.path.basename(ev.image_path)
        out.append(item)
    return out


@router.delete("/alerts", status_code=204, dependencies=[Depends(get_current_user)])
def clear_alerts(db: Session = Depends(get_db)):
    db.query(models.Alert).delete()
    db.commit()


