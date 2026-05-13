from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app import models, schemas
from app.api.auth import get_current_admin

router = APIRouter(prefix="/api/danhmuc", tags=["Danh Mục"])

# Lấy danh sách danh mục (Public - Ai cũng xem được)
@router.get("/", response_model=List[schemas.DanhMuc])
def get_categories(db: Session = Depends(get_db)):
    return db.query(models.DanhMuc).all()

# Thêm danh mục mới (Chỉ Admin)
@router.post("/", response_model=schemas.DanhMuc)
def create_category(category: schemas.DanhMucCreate, db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    db_category = models.DanhMuc(tenDanhMuc=category.tenDanhMuc, moTa=category.moTa)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

# Sửa danh mục (Chỉ Admin)
@router.put("/{id_danhMuc}", response_model=schemas.DanhMuc)
def update_category(id_danhMuc: int, category: schemas.DanhMucCreate, db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    db_category = db.query(models.DanhMuc).filter(models.DanhMuc.id_danhMuc == id_danhMuc).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh mục")
    
    db_category.tenDanhMuc = category.tenDanhMuc
    db_category.moTa = category.moTa
    db.commit()
    db.refresh(db_category)
    return db_category

# Xóa danh mục (Chỉ Admin)
@router.delete("/{id_danhMuc}")
def delete_category(id_danhMuc: int, db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    db_category = db.query(models.DanhMuc).filter(models.DanhMuc.id_danhMuc == id_danhMuc).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh mục")
        
    # Có thể kiểm tra xem có món ăn nào đang dùng danh mục này không trước khi xóa
    mon_an = db.query(models.ThucDon).filter(models.ThucDon.id_danhMuc == id_danhMuc).first()
    if mon_an:
        raise HTTPException(status_code=400, detail="Không thể xóa danh mục đang có món ăn")
        
    db.delete(db_category)
    db.commit()
    return {"message": "Xóa danh mục thành công"}
