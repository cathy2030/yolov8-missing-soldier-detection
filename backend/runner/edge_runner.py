"""Edge webcam/video runner using DIRECT model inference.

Counts how many soldiers are present in each frame by running the detection
model directly (client.infer) and counting 'person' boxes, then posts the count
to the backend. This matches the image/video upload path and avoids the video
tracker, which returns 0 on per-frame calls.

Reads config from backend/.env; SESSION_ID / EXPECTED_COUNT / VIDEO_REFERENCE
can be set inline or added to .env.
"""
import os
import time
import base64
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

import cv2
import httpx
from inference_sdk import InferenceHTTPClient

API_URL = os.getenv("ROBOFLOW_API_URL", "https://serverless.roboflow.com")
API_KEY = os.environ["ROBOFLOW_API_KEY"]
MODEL_ID = os.environ["ROBOFLOW_MODEL_ID"]
CONF = float(os.getenv("DETECT_CONFIDENCE", "0.30"))
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000").rstrip("/")
RUNNER_API_KEY = os.environ["RUNNER_API_KEY"]
SESSION_ID = int(os.environ["SESSION_ID"])
EXPECTED_COUNT = int(os.getenv("EXPECTED_COUNT", "0"))
VIDEO_REFERENCE = os.getenv("VIDEO_REFERENCE", "0")
POST_EVERY_SECONDS = float(os.getenv("POST_EVERY_SECONDS", "3"))

PERSON_CLASSES = {"person", "soldier"}
client = InferenceHTTPClient(api_url=API_URL, api_key=API_KEY)


def count_people(path: str) -> int:
    result = client.infer(path, model_id=MODEL_ID)
    preds = result.get("predictions", []) if isinstance(result, dict) else []
    if isinstance(preds, dict):
        preds = preds.get("predictions", [])
    people = [p for p in preds if isinstance(p, dict)
              and p.get("class") in PERSON_CLASSES
              and float(p.get("confidence", 0)) >= CONF]
    return len(people)


def main():
    source = 0 if VIDEO_REFERENCE == "0" else VIDEO_REFERENCE
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"ERROR: could not open video source {source!r}")
        return
    print(f"Runner started for session {SESSION_ID}. Source: {VIDEO_REFERENCE}. Model: {MODEL_ID}")

    last = 0.0
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                print("End of stream or cannot read frame.")
                break
            now = time.time()
            if now - last < POST_EVERY_SECONDS:
                continue
            last = now

            tmp = "/tmp/parade_frame.jpg"
            cv2.imwrite(tmp, frame)
            try:
                detected = count_people(tmp)
            except Exception as exc:  # noqa: BLE001
                print("Inference failed:", exc)
                continue

            ok2, buf = cv2.imencode(".jpg", frame)
            image_b64 = base64.b64encode(buf.tobytes()).decode("ascii") if ok2 else None
            try:
                r = httpx.post(
                    f"{BACKEND_URL}/api/events/ingest",
                    headers={"X-Runner-Key": RUNNER_API_KEY},
                    json={"session_id": SESSION_ID, "detected_count": detected,
                          "expected_count": EXPECTED_COUNT or None, "image_base64": image_b64},
                    timeout=30.0,
                )
                r.raise_for_status()
                d = r.json()
                print(f"[{d['status']}] present {d['detected_count']}/{d['expected_count']} missing {d['missing_count']}")
            except Exception as exc:  # noqa: BLE001
                print("Failed to POST event:", exc)
    finally:
        cap.release()


if __name__ == "__main__":
    main()
    
    