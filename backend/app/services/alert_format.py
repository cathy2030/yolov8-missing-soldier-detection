"""Builds a professional, human-readable alert briefing for Telegram (HTML) and
a matching plain-text version for email. Kept separate so the upload path and the
runner-ingest path produce identical, well-formatted alerts."""
from datetime import datetime, timezone, timedelta

# West Africa Time (Nigeria, UTC+1) so timestamps read local for the duty officer.
WAT = timezone(timedelta(hours=1))


def _fmt_time(dt: datetime | None = None) -> str:
    dt = (dt or datetime.now(timezone.utc)).astimezone(WAT)
    return dt.strftime("%d %b %Y, %I:%M:%S %p WAT")


def build_alert(*, muster_name: str, site_name: str, detected: int, expected: int,
                missing: int, when: datetime | None = None):
    """Return (email_subject, email_body_text, telegram_html)."""
    ts = _fmt_time(when)
    pct = round((detected / expected) * 100) if expected else 0

    subject = f"🚨 Parade Alert — {missing} unaccounted for at {muster_name}"

    # Plain text (email)
    email_body = (
        "PERSONNEL ACCOUNTABILITY ALERT\n"
        "--------------------------------\n"
        f"Status      : SHORTFALL DETECTED\n"
        f"Muster      : {muster_name}\n"
        f"Location    : {site_name}\n"
        f"On parade   : {detected} of {expected} ({pct}%)\n"
        f"Unaccounted : {missing}\n"
        f"Time        : {ts}\n"
        "--------------------------------\n"
        "Action: verify the formation and confirm the whereabouts of missing personnel."
    )

    # HTML (Telegram)
    telegram_html = (
        "🚨 <b>PERSONNEL ACCOUNTABILITY ALERT</b>\n"
        "<i>Shortfall detected on parade</i>\n\n"
        f"🎖 <b>Muster:</b> {muster_name}\n"
        f"📍 <b>Location:</b> {site_name}\n"
        f"👥 <b>On parade:</b> {detected} of {expected}  (<b>{pct}%</b>)\n"
        f"⚠️ <b>Unaccounted:</b> {missing}\n"
        f"🕒 <b>Time:</b> {ts}\n\n"
        "➡️ <i>Verify the formation and confirm the whereabouts of the missing personnel.</i>"
    )
    return subject, email_body, telegram_html


def build_all_present(*, muster_name: str, site_name: str, detected: int,
                      expected: int, when: datetime | None = None):
    """Optional 'all present' confirmation (used only if you choose to notify on OK)."""
    ts = _fmt_time(when)
    subject = f"✅ Parade Confirmed — {muster_name} all present"
    email_body = (
        "PERSONNEL ACCOUNTABILITY CONFIRMATION\n"
        f"Muster   : {muster_name}\n"
        f"Location : {site_name}\n"
        f"On parade: {detected} of {expected}\n"
        f"Time     : {ts}\n"
        "Status   : ALL PRESENT AND CORRECT."
    )
    telegram_html = (
        "✅ <b>PARADE CONFIRMED</b>\n\n"
        f"🎖 <b>Muster:</b> {muster_name}\n"
        f"📍 <b>Location:</b> {site_name}\n"
        f"👥 <b>On parade:</b> {detected} of {expected}\n"
        f"🕒 <b>Time:</b> {ts}\n\n"
        "<i>All present and correct.</i>"
    )
    return subject, email_body, telegram_html

