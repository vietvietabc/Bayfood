from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app import models
from app import schemas
from app.api.auth import get_current_admin
router = APIRouter(prefix="/api/thucdon", tags=["Thực Đơn"])

@router.get("/danhmuc", response_model=List[schemas.DanhMuc])
def get_categories(db: Session = Depends(get_db)):
    return db.query(models.DanhMuc).all()

@router.get("/", response_model=List[schemas.ThucDon])
def get_menu_items(db: Session = Depends(get_db)):
    return db.query(models.ThucDon).filter(models.ThucDon.trangThai == "Đang bán").all()

@router.get("/danhmuc/{id_danhMuc}", response_model=List[schemas.ThucDon])
def get_menu_items_by_category(id_danhMuc: int, db: Session = Depends(get_db)):
    return db.query(models.ThucDon).filter(
        models.ThucDon.id_danhMuc == id_danhMuc,
        models.ThucDon.trangThai == "Đang bán"
    ).all()

class ThucDonCreate(schemas.ThucDonBase):
    pass

@router.get("/all/list", response_model=List[schemas.ThucDon])
def get_all_menu_items(db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    return db.query(models.ThucDon).order_by(models.ThucDon.id_monAn.desc()).all()

@router.post("/", response_model=schemas.ThucDon)
def create_menu_item(item: ThucDonCreate, db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    db_item = models.ThucDon(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/{id_monAn}")
def update_menu_item(id_monAn: int, item: ThucDonCreate, db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    db_item = db.query(models.ThucDon).filter(models.ThucDon.id_monAn == id_monAn).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    for key, value in item.model_dump().items():
        setattr(db_item, key, value)
    db.commit()
    return {"message": "Cập nhật thành công"}

@router.delete("/{id_monAn}")
def delete_menu_item(id_monAn: int, db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    db_item = db.query(models.ThucDon).filter(models.ThucDon.id_monAn == id_monAn).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    db_item.trangThai = "Ngừng bán"
    db.commit()
    return {"message": "Đã ngừng bán món này"}
