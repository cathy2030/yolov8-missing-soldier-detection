from datetime import datetime, timezone, timedelta
from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..deps import get_current_user
from .. import models, schemas

router = APIRouter(prefix="/api", tags=["dashboard"], dependencies=[Depends(get_current_user)])


@router.get("/dashboard/summary", response_model=schemas.DashboardSummary)
def summary(db: Session = Depends(get_db)):
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    latest = db.query(models.AttendanceEvent).order_by(models.AttendanceEvent.id.desc()).first()
    return schemas.DashboardSummary(
        total_sites=db.query(func.count(models.Site.id)).scalar() or 0,
        active_sessions=db.query(func.count(models.ParadeSession.id))
            .filter(models.ParadeSession.status == "active").scalar() or 0,
        total_events_today=db.query(func.count(models.AttendanceEvent.id))
            .filter(models.AttendanceEvent.created_at >= since).scalar() or 0,
        total_alerts_today=db.query(func.count(models.Alert.id))
            .filter(models.Alert.created_at >= since).scalar() or 0,
        latest_status=latest.status if latest else None,
        latest_detected=latest.detected_count if latest else None,
        latest_expected=latest.expected_count if latest else None,
    )


@router.get("/dashboard/trends")
def trends(days: int = 7, db: Session = Depends(get_db)):
    """Aggregated data for the overview charts, over the last `days` days."""
    days = max(1, min(days, 90))
    since = datetime.now(timezone.utc) - timedelta(days=days)

    events = (db.query(models.AttendanceEvent)
              .filter(models.AttendanceEvent.created_at >= since).all())
    alerts = (db.query(models.Alert)
              .filter(models.Alert.created_at >= since).all())

    # per-day buckets
    day_events = defaultdict(list)
    for e in events:
        key = e.created_at.astimezone(timezone.utc).strftime("%Y-%m-%d")
        day_events[key].append(e)
    day_alerts = defaultdict(int)
    for a in alerts:
        key = a.created_at.astimezone(timezone.utc).strftime("%Y-%m-%d")
        day_alerts[key] += 1

    daily = []
    for i in range(days - 1, -1, -1):
        d = (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
        evs = day_events.get(d, [])
        n = len(evs)
        avg_present = round(sum(e.detected_count for e in evs) / n, 1) if n else 0
        avg_missing = round(sum(e.missing_count for e in evs) / n, 1) if n else 0
        daily.append({
            "date": d[5:],  # MM-DD
            "events": n,
            "alerts": day_alerts.get(d, 0),
            "avg_present": avg_present,
            "avg_missing": avg_missing,
        })

    complete = sum(1 for e in events if e.status == "COMPLETE")
    missing = sum(1 for e in events if e.status == "MISSING")

    # per-muster latest reading
    per_muster = []
    sessions = db.query(models.ParadeSession).order_by(models.ParadeSession.id.desc()).limit(8).all()
    for s in sessions:
        latest = (db.query(models.AttendanceEvent)
                  .filter(models.AttendanceEvent.session_id == s.id)
                  .order_by(models.AttendanceEvent.id.desc()).first())
        per_muster.append({
            "name": s.name,
            "expected": s.expected_count,
            "present": latest.detected_count if latest else None,
            "missing": latest.missing_count if latest else None,
            "status": latest.status if latest else "AWAITING",
        })

    return {
        "days": days,
        "daily": daily,
        "status_split": {"complete": complete, "missing": missing},
        "totals": {
            "events": len(events),
            "alerts": len(alerts),
            "musters": db.query(func.count(models.ParadeSession.id)).scalar() or 0,
            "sites": db.query(func.count(models.Site.id)).scalar() or 0,
        },
        "per_muster": per_muster,
    }


