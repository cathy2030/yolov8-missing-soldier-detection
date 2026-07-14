"""Create the first admin user from .env values. Run once: python seed_admin.py"""
from app.database import Base, engine, SessionLocal
from app.config import get_settings
from app.security import hash_password
from app import models

settings = get_settings()
Base.metadata.create_all(bind=engine)
db = SessionLocal()
try:
    existing = db.query(models.User).filter(models.User.email == settings.ADMIN_EMAIL).first()
    if existing:
        print(f"Admin already exists: {settings.ADMIN_EMAIL}")
    else:
        user = models.User(
            email=settings.ADMIN_EMAIL,
            full_name=settings.ADMIN_FULL_NAME,
            hashed_password=hash_password(settings.ADMIN_PASSWORD),
            role="admin",
        )
        db.add(user)
        db.commit()
        print(f"Created admin: {settings.ADMIN_EMAIL}")
finally:
    db.close()
    
    