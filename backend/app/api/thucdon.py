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

@router.get("/{id_monAn}/chi-tiet", response_model=schemas.ThucDon)
def get_menu_item_detail(id_monAn: int, db: Session = Depends(get_db)):
    item = db.query(models.ThucDon).filter(models.ThucDon.id_monAn == id_monAn).first()
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy món ăn")
    return item

@router.get("/{id_monAn}/danhgia", response_model=List[schemas.MonAnDanhGia])
def get_food_reviews(id_monAn: int, limit: int = 10, db: Session = Depends(get_db)):
    # Join DanhGia -> DonHang -> ChiTietDonHang -> NguoiDung
    # Lấy các đánh giá thuộc về đơn hàng có chứa món ăn này
    reviews = (
        db.query(
            models.DanhGia.id_danhGia,
            models.DanhGia.id_nguoiDung,
            models.NguoiDung.hoTen.label("tenNguoiDung"),
            models.DanhGia.soSao,
            models.DanhGia.noiDung
        )
        .join(models.NguoiDung, models.DanhGia.id_nguoiDung == models.NguoiDung.id_nguoiDung)
        .join(models.DonHang, models.DanhGia.id_donHang == models.DonHang.id_donHang)
        .join(models.ChiTietDonHang, models.DonHang.id_donHang == models.ChiTietDonHang.id_donHang)
        .filter(models.ChiTietDonHang.id_monAn == id_monAn)
        .filter((models.DanhGia.id_monAn == id_monAn) | (models.DanhGia.id_monAn.is_(None)))
        .distinct(models.DanhGia.id_danhGia)
        .order_by(models.DanhGia.id_danhGia.desc())
        .limit(limit)
        .all()
    )
    return reviews

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
        raise HTTPException(status_code=404, detail="Không tìm thấy món ăn")
    for key, value in item.model_dump().items():
        setattr(db_item, key, value)
    db.commit()
    return {"message": "Cập nhật thành công"}

@router.delete("/{id_monAn}")
def delete_menu_item(id_monAn: int, db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    db_item = db.query(models.ThucDon).filter(models.ThucDon.id_monAn == id_monAn).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy món ăn")
    db_item.trangThai = "Ngừng bán"
    db.commit()
    return {"message": "Đã ngừng bán món này"}
