from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app import models, schemas
from app.api.auth import get_current_admin, get_current_user

router = APIRouter(prefix="/api/danhgia", tags=["Đánh Giá"])

def _build_review_response(db: Session, dg: models.DanhGia) -> dict:
    """Build enriched review dict with tenKhachHang and tenMon."""
    khach = db.query(models.NguoiDung).filter(
        models.NguoiDung.id_nguoiDung == dg.id_nguoiDung
    ).first()

    ten_mon = None
    if dg.id_monAn:
        mon = db.query(models.ThucDon).filter(
            models.ThucDon.id_monAn == dg.id_monAn
        ).first()
        ten_mon = mon.tenMon if mon else None

    return {
        "id_danhGia": dg.id_danhGia,
        "id_nguoiDung": dg.id_nguoiDung,
        "id_donHang": dg.id_donHang,
        "id_monAn": dg.id_monAn,
        "soSao": dg.soSao,
        "noiDung": dg.noiDung,
        "tenKhachHang": khach.hoTen if khach else None,
        "tenMon": ten_mon,
    }

# Lấy danh sách toàn bộ đánh giá (kèm thông tin user)
# type=general: chỉ đánh giá chung (id_monAn IS NULL)
# type=food: chỉ đánh giá món (id_monAn IS NOT NULL)
# type=all hoặc không truyền: toàn bộ
@router.get("/", response_model=List[schemas.DanhGiaResponse])
def get_all_reviews(
    type: Optional[str] = Query(None, description="general | food | all"),
    db: Session = Depends(get_db)
):
    query = db.query(models.DanhGia)
    if type == "general":
        query = query.filter(models.DanhGia.id_monAn == None)
    elif type == "food":
        query = query.filter(models.DanhGia.id_monAn != None)
    reviews = query.order_by(models.DanhGia.id_danhGia.desc()).all()
    return [_build_review_response(db, r) for r in reviews]

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
            models.DanhGia.id_monAn == danh_gia.id_monAn
        )
        .first()
    )
    if existing_review:
        raise HTTPException(status_code=400, detail="Bạn đã đánh giá nội dung này rồi")

    db_danh_gia = models.DanhGia(
        id_nguoiDung=current_user.id_nguoiDung,
        id_donHang=danh_gia.id_donHang,
        id_monAn=danh_gia.id_monAn,
        soSao=danh_gia.soSao,
        noiDung=danh_gia.noiDung
    )
    db.add(db_danh_gia)
    db.commit()
    db.refresh(db_danh_gia)
    return _build_review_response(db, db_danh_gia)

@router.get("/me", response_model=List[schemas.DanhGiaResponse])
def get_my_reviews(db: Session = Depends(get_db), current_user: models.NguoiDung = Depends(get_current_user)):
    reviews = (
        db.query(models.DanhGia)
        .filter(models.DanhGia.id_nguoiDung == current_user.id_nguoiDung)
        .order_by(models.DanhGia.id_danhGia.desc())
        .all()
    )
    return [_build_review_response(db, r) for r in reviews]

@router.get("/donhang/{id_donHang}", response_model=List[schemas.DanhGiaResponse])
def get_reviews_by_order(id_donHang: int, db: Session = Depends(get_db)):
    reviews = (
        db.query(models.DanhGia)
        .filter(models.DanhGia.id_donHang == id_donHang)
        .order_by(models.DanhGia.id_danhGia.desc())
        .all()
    )
    return [_build_review_response(db, r) for r in reviews]

# Xóa đánh giá (Chỉ Admin mới có quyền xóa các đánh giá spam/không hợp lệ)
@router.delete("/{id_danhGia}")
def delete_review(id_danhGia: int, db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    db_danh_gia = db.query(models.DanhGia).filter(models.DanhGia.id_danhGia == id_danhGia).first()
    if not db_danh_gia:
        raise HTTPException(status_code=404, detail="Không tìm thấy đánh giá")
    
    db.delete(db_danh_gia)
    db.commit()
    return {"message": "Xóa đánh giá thành công"}
