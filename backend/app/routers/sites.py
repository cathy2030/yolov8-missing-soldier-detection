from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import get_current_user
from .. import models, schemas

router = APIRouter(prefix="/api", tags=["sites"], dependencies=[Depends(get_current_user)])


@router.get("/sites", response_model=list[schemas.SiteOut])
def list_sites(db: Session = Depends(get_db)):
    return db.query(models.Site).order_by(models.Site.id.desc()).all()


@router.post("/sites", response_model=schemas.SiteOut, status_code=201)
def create_site(payload: schemas.SiteCreate, db: Session = Depends(get_db)):
    site = models.Site(**payload.model_dump())
    db.add(site); db.commit(); db.refresh(site)
    return site


@router.delete("/sites/{site_id}", status_code=204)
def delete_site(site_id: int, db: Session = Depends(get_db)):
    site = db.get(models.Site, site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    db.delete(site); db.commit()


@router.get("/cameras", response_model=list[schemas.CameraOut])
def list_cameras(db: Session = Depends(get_db)):
    return db.query(models.Camera).all()


@router.post("/cameras", response_model=schemas.CameraOut, status_code=201)
def create_camera(payload: schemas.CameraCreate, db: Session = Depends(get_db)):
    if not db.get(models.Site, payload.site_id):
        raise HTTPException(status_code=404, detail="Site not found")
    cam = models.Camera(**payload.model_dump())
    db.add(cam); db.commit(); db.refresh(cam)
    return cam

