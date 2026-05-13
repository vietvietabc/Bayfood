from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app import models, schemas
from app.api.auth import get_current_admin, get_current_user

router = APIRouter(prefix="/api/danhgia", tags=["Đánh Giá"])

# Lấy danh sách toàn bộ đánh giá (kèm thông tin user)
@router.get("/", response_model=List[schemas.DanhGiaResponse])
def get_all_reviews(db: Session = Depends(get_db)):
    # Có thể thêm thông tin người dùng vào response sau này nếu cần thiết (hiện tại trả về id_nguoiDung)
    return db.query(models.DanhGia).all()

# Thêm đánh giá mới (Dành cho User đã đăng nhập)
@router.post("/", response_model=schemas.DanhGiaResponse)
def create_review(danh_gia: schemas.DanhGiaCreate, db: Session = Depends(get_db), current_user: models.NguoiDung = Depends(get_current_user)):
    db_order = (
        db.query(models.DonHang)
        .filter(
            models.DonHang.id_donHang == danh_gia.id_donHang,
            models.DonHang.id_nguoiDung == current_user.id_nguoiDung,
        )
        .first()
    )
    if not db_order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng của bạn")

    existing_review = (
        db.query(models.DanhGia)
        .filter(
            models.DanhGia.id_donHang == danh_gia.id_donHang,
            models.DanhGia.id_nguoiDung == current_user.id_nguoiDung,
        )
        .first()
    )
    if existing_review:
        raise HTTPException(status_code=400, detail="Bạn đã đánh giá đơn hàng này rồi")

    db_danh_gia = models.DanhGia(
        id_nguoiDung=current_user.id_nguoiDung,
        id_donHang=danh_gia.id_donHang,
        soSao=danh_gia.soSao,
        noiDung=danh_gia.noiDung
    )
    db.add(db_danh_gia)
    db.commit()
    db.refresh(db_danh_gia)
    return db_danh_gia

@router.get("/me", response_model=List[schemas.DanhGiaResponse])
def get_my_reviews(db: Session = Depends(get_db), current_user: models.NguoiDung = Depends(get_current_user)):
    return (
        db.query(models.DanhGia)
        .filter(models.DanhGia.id_nguoiDung == current_user.id_nguoiDung)
        .order_by(models.DanhGia.id_danhGia.desc())
        .all()
    )

@router.get("/donhang/{id_donHang}", response_model=List[schemas.DanhGiaResponse])
def get_reviews_by_order(id_donHang: int, db: Session = Depends(get_db)):
    return (
        db.query(models.DanhGia)
        .filter(models.DanhGia.id_donHang == id_donHang)
        .order_by(models.DanhGia.id_danhGia.desc())
        .all()
    )

# Xóa đánh giá (Chỉ Admin mới có quyền xóa các đánh giá spam/không hợp lệ)
@router.delete("/{id_danhGia}")
def delete_review(id_danhGia: int, db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    db_danh_gia = db.query(models.DanhGia).filter(models.DanhGia.id_danhGia == id_danhGia).first()
    if not db_danh_gia:
        raise HTTPException(status_code=404, detail="Không tìm thấy đánh giá")
    
    db.delete(db_danh_gia)
    db.commit()
    return {"message": "Xóa đánh giá thành công"}
