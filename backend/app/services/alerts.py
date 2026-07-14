"""Alert dispatch: email via Resend, and Telegram via the Bot API.

Both channels degrade gracefully to a logged no-op when their credentials are
absent, so the app runs fine with neither, one, or both configured.
"""
import logging
import httpx
from ..config import get_settings

settings = get_settings()
log = logging.getLogger("alerts")


def send_email(subject: str, body: str) -> bool:
    if not (settings.RESEND_API_KEY and settings.ALERT_EMAIL_FROM and settings.ALERT_EMAIL_TO):
        log.warning("Email not configured; skipping email alert.")
        return False
    try:
        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            json={
                "from": settings.ALERT_EMAIL_FROM,
                "to": [settings.ALERT_EMAIL_TO],
                "subject": subject,
                "text": body,
            },
            timeout=15.0,
        )
        resp.raise_for_status()
        return True
    except Exception as exc:  # noqa: BLE001
        log.error("Email alert failed: %s", exc)
        return False


def send_telegram(text: str) -> bool:
    if not (settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHAT_ID):
        log.warning("Telegram not configured; skipping Telegram alert.")
        return False
    try:
        resp = httpx.post(
            f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage",
            json={
                "chat_id": settings.TELEGRAM_CHAT_ID,
                "text": text,
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
            },
            timeout=15.0,
        )
        resp.raise_for_status()
        data = resp.json()
        if not data.get("ok"):
            log.error("Telegram API returned not-ok: %s", data)
            return False
        return True
    except Exception as exc:  # noqa: BLE001
        log.error("Telegram alert failed: %s", exc)
        return False


def dispatch_alert(subject: str, body: str, telegram_html: str | None = None) -> str:
    """Send on all configured channels; return a comma-separated list that succeeded.

    email uses (subject, body); Telegram uses telegram_html when provided, else a
    simple bold-subject + body fallback."""
    sent = []
    if send_email(subject, body):
        sent.append("email")
    tg_text = telegram_html if telegram_html else f"<b>{subject}</b>\n\n{body}"
    if send_telegram(tg_text):
        sent.append("telegram")
    return ",".join(sent)

