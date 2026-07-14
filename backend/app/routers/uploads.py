"""Image + video upload analysis using DIRECT model inference.

Why direct inference (client.infer) and not the full workflow: the workflow
counts via a ByteTrack tracker + vision-events sink, which is designed for
video streams and returns an empty result on single still frames. Counting how
many soldiers are present in a frame is plain per-frame detection, which works
identically on an image, a video frame, or a webcam frame. So we call the
detection model directly and count the 'person' boxes it returns.
"""
import os
from datetime import datetime, timezone
import cv2
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from sqlalchemy.orm import Session
from ..database import get_db, SessionLocal
from ..deps import get_current_user
from ..config import get_settings
from ..services.alerts import dispatch_alert
from ..services.alert_format import build_alert
from .. import models, schemas

settings = get_settings()
router = APIRouter(prefix="/api", tags=["uploads"], dependencies=[Depends(get_current_user)])

EVIDENCE_DIR = os.getenv("EVIDENCE_DIR", "data/evidence")
os.makedirs(EVIDENCE_DIR, exist_ok=True)

PERSON_CLASSES = {"person", "soldier"}


# ---- inference ------------------------------------------------------------
def _infer_people(path: str) -> list[dict]:
    """Run the detection model on one image file and return the person detections."""
    from inference_sdk import InferenceHTTPClient
    if not settings.ROBOFLOW_MODEL_ID:
        raise RuntimeError("ROBOFLOW_MODEL_ID is not set in .env")
    client = InferenceHTTPClient(api_url=settings.ROBOFLOW_API_URL, api_key=settings.ROBOFLOW_API_KEY)
    result = client.infer(path, model_id=settings.ROBOFLOW_MODEL_ID)
    preds = result.get("predictions", []) if isinstance(result, dict) else []
    if isinstance(preds, dict):
        preds = preds.get("predictions", [])
    return [p for p in preds
            if isinstance(p, dict)
            and p.get("class") in PERSON_CLASSES
            and float(p.get("confidence", 0)) >= settings.DETECT_CONFIDENCE]


def _annotate_and_save(session_id: int, frame_bgr, people: list[dict]) -> str:
    """Draw boxes + a count banner on the frame and save it as evidence."""
    brass = (78, 164, 199)  # BGR
    for p in people:
        x, y, w, h = p.get("x", 0), p.get("y", 0), p.get("width", 0), p.get("height", 0)
        x1, y1, x2, y2 = int(x - w / 2), int(y - h / 2), int(x + w / 2), int(y + h / 2)
        cv2.rectangle(frame_bgr, (x1, y1), (x2, y2), brass, 2)
    label = f"{len(people)} present"
    cv2.rectangle(frame_bgr, (0, 0), (260, 40), (20, 27, 23), -1)
    cv2.putText(frame_bgr, label, (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
    out = os.path.join(EVIDENCE_DIR, f"session{session_id}_{ts}.jpg")
    cv2.imwrite(out, frame_bgr)
    return out


# ---- event + alert (shared) ----------------------------------------------
def _create_event(db: Session, sess: models.ParadeSession, detected: int, evidence_path: str | None):
    expected = sess.expected_count
    missing = max(0, expected - detected)
    status_str = "MISSING" if missing > 0 else "COMPLETE"
    ev = models.AttendanceEvent(
        session_id=sess.id, detected_count=detected, expected_count=expected,
        missing_count=missing, status=status_str, image_path=evidence_path,
    )
    db.add(ev); db.commit(); db.refresh(ev)
    if status_str == "MISSING":
        site = db.get(models.Site, sess.site_id)
        site_name = site.name if site else "Unknown site"
        subject, email_body, tg_html = build_alert(
            muster_name=sess.name, site_name=site_name,
            detected=detected, expected=expected, missing=missing, when=ev.created_at)
        al = models.Alert(session_id=sess.id, event_id=ev.id, missing_count=missing, message=email_body)
        db.add(al); db.commit(); db.refresh(al)
        channels = dispatch_alert(subject, email_body, tg_html)
        al.channels = channels
        al.delivered = bool(channels)
        db.commit()
    return ev


def _event_out(ev: models.AttendanceEvent) -> schemas.EventOut:
    item = schemas.EventOut.model_validate(ev)
    if ev.image_path:
        item.image_url = "/evidence/" + os.path.basename(ev.image_path)
    return item


# ---- image: synchronous ---------------------------------------------------
@router.post("/sessions/{session_id}/analyze-image", response_model=schemas.EventOut, status_code=201)
async def analyze_image(session_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    sess = db.get(models.ParadeSession, session_id)
    if not sess or sess.status != "active":
        raise HTTPException(status_code=404, detail="Active muster not found")

    raw = await file.read()
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
    src = os.path.join(EVIDENCE_DIR, f"_src_{session_id}_{ts}.jpg")
    with open(src, "wb") as fh:
        fh.write(raw)

    try:
        people = _infer_people(src)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Roboflow inference failed: {exc}")

    frame = cv2.imread(src)
    evidence = _annotate_and_save(session_id, frame, people) if frame is not None else src
    try:
        if evidence != src:
            os.remove(src)
    except OSError:
        pass

    ev = _create_event(db, sess, len(people), evidence)
    return _event_out(ev)


# ---- video: background frame sampling -------------------------------------
def _process_video(session_id: int, vid_path: str, sample_seconds: float = 1.5, max_frames: int = 25):
    db = SessionLocal()
    try:
        sess = db.get(models.ParadeSession, session_id)
        if not sess:
            return
        cap = cv2.VideoCapture(vid_path)
        if not cap.isOpened():
            return
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        step = max(1, int(fps * sample_seconds))
        idx, processed = 0, 0
        last_count = None
        while processed < max_frames:
            ok, frame = cap.read()
            if not ok:
                break
            if idx % step != 0:
                idx += 1
                continue
            idx += 1
            tmp = os.path.join(EVIDENCE_DIR, f"_tmp_{session_id}.jpg")
            cv2.imwrite(tmp, frame)
            try:
                people = _infer_people(tmp)
            except Exception:  # noqa: BLE001
                continue
            count = len(people)
            # skip a frame that repeats the previous count (avoids duplicate log rows)
            if count == last_count:
                idx += 1
                continue
            last_count = count
            evidence = _annotate_and_save(session_id, frame, people)
            _create_event(db, sess, count, evidence)
            processed += 1
        cap.release()
    finally:
        db.close()


@router.post("/sessions/{session_id}/analyze-video", status_code=202)
async def analyze_video(session_id: int, background: BackgroundTasks,
                        file: UploadFile = File(...), db: Session = Depends(get_db)):
    sess = db.get(models.ParadeSession, session_id)
    if not sess or sess.status != "active":
        raise HTTPException(status_code=404, detail="Active muster not found")
    raw = await file.read()
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
    vid_path = os.path.join(EVIDENCE_DIR, f"upload_session{session_id}_{ts}.mp4")
    with open(vid_path, "wb") as fh:
        fh.write(raw)
    background.add_task(_process_video, session_id, vid_path)
    return {"status": "processing",
            "message": "Video uploaded. Frames will appear in the attendance log as they are analysed."}

