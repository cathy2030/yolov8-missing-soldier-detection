from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    SECRET_KEY: str = "dev-secret"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ALGORITHM: str = "HS256"
    CORS_ORIGINS: str = "http://localhost:5173"

    # Database
    DATABASE_URL: str = "postgresql+psycopg2://parade:parade@localhost:5432/parade_monitor"

    # First admin
    ADMIN_EMAIL: str = "admin@parade.local"
    ADMIN_PASSWORD: str = "ChangeThisPassword123"
    ADMIN_FULL_NAME: str = "System Administrator"

    # Runner auth
    RUNNER_API_KEY: str = "change-me-runner-key"

    # Roboflow
    ROBOFLOW_API_KEY: str = ""
    ROBOFLOW_WORKSPACE: str = ""
    ROBOFLOW_WORKFLOW_ID: str = ""
    ROBOFLOW_API_URL: str = "https://serverless.roboflow.com"
    ROBOFLOW_MODEL_ID: str = ""          # e.g. "yolov11s-1280" or "your-project/3"
    DETECT_CONFIDENCE: float = 0.30       # min confidence to count a person

    # Email (Resend)
    RESEND_API_KEY: str = ""
    ALERT_EMAIL_FROM: str = ""
    ALERT_EMAIL_TO: str = ""

    # Telegram
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""

    # WhatsApp (Twilio)
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_FROM: str = ""
    ALERT_WHATSAPP_TO: str = ""

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

