from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool


class SiteCreate(BaseModel):
    name: str
    location: str = ""
    default_expected_count: int = 0


class SiteOut(SiteCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int


class CameraCreate(BaseModel):
    site_id: int
    name: str
    stream_url: str = ""


class CameraOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    site_id: int
    name: str
    stream_url: str
    is_active: bool


class SessionCreate(BaseModel):
    site_id: int
    camera_id: int | None = None
    name: str
    expected_count: int


class SessionUpdate(BaseModel):
    name: str | None = None
    expected_count: int | None = None


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    site_id: int
    camera_id: int | None
    name: str
    expected_count: int
    status: str
    started_at: datetime
    ended_at: datetime | None


class EventIngest(BaseModel):
    session_id: int
    detected_count: int
    expected_count: int | None = None
    image_base64: str | None = None


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    session_id: int
    detected_count: int
    expected_count: int
    missing_count: int
    status: str
    image_path: str | None
    image_url: str | None = None
    created_at: datetime


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    session_id: int
    event_id: int
    missing_count: int
    message: str
    channels: str
    delivered: bool
    image_url: str | None = None
    created_at: datetime


class DashboardSummary(BaseModel):
    total_sites: int
    active_sessions: int
    total_events_today: int
    total_alerts_today: int
    latest_status: str | None
    latest_detected: int | None
    latest_expected: int | None

