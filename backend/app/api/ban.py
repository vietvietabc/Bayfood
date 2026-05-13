from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pathlib import Path
from app.db.database import get_db
from app import models, schemas
from app.api.auth import get_current_admin
import qrcode

router = APIRouter(prefix="/api/ban", tags=["Bàn"])

FRONTEND_MENU_URL = "http://localhost:5173/menu"
QR_UPLOAD_DIR = Path("app/static/uploads/tables/qrcodes")


def build_table_qr_url(id_ban: int) -> str:
    qr_data = f"{FRONTEND_MENU_URL}?table={id_ban}"
    QR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    file_name = f"table-{id_ban}.png"
    file_path = QR_UPLOAD_DIR / file_name

    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=4)
    qr.add_data(qr_data)
    qr.make(fit=True)

    image = qr.make_image(fill_color="black", back_color="white")
    image.save(file_path)

    return f"http://localhost:8000/static/uploads/tables/qrcodes/{file_name}"

# Lấy danh sách toàn bộ bàn (Public để khách cũng xem được bàn trống)
@router.get("/", response_model=List[schemas.BanResponse])
def get_all_tables(db: Session = Depends(get_db)):
    return db.query(models.Ban).all()

@router.get("/available", response_model=List[schemas.BanResponse])
def get_available_tables(db: Session = Depends(get_db)):
    return db.query(models.Ban).filter(models.Ban.trangThai == "Trống").all()

# Thêm bàn mới (Chỉ Admin)
@router.post("/", response_model=schemas.BanResponse)
def create_table(ban: schemas.BanCreate, db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    db_ban = models.Ban(
        tenBan=ban.tenBan,
        sucChua=ban.sucChua,
        viTri=ban.viTri,
        hinhAnh=ban.hinhAnh,
        trangThai=ban.trangThai
    )
    db.add(db_ban)
    db.flush()
    db_ban.maQR_url = build_table_qr_url(db_ban.id_ban)
    db.commit()
    db.refresh(db_ban)
    return db_ban

# Sửa thông tin bàn (Chỉ Admin)
@router.put("/{id_ban}", response_model=schemas.BanResponse)
def update_table(id_ban: int, ban: schemas.BanCreate, db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    db_ban = db.query(models.Ban).filter(models.Ban.id_ban == id_ban).first()
    if not db_ban:
        raise HTTPException(status_code=404, detail="Không tìm thấy bàn")
    
    db_ban.tenBan = ban.tenBan
    db_ban.sucChua = ban.sucChua
    db_ban.viTri = ban.viTri
    db_ban.hinhAnh = ban.hinhAnh
    db_ban.trangThai = ban.trangThai
    db_ban.maQR_url = build_table_qr_url(db_ban.id_ban)
    db.commit()
    db.refresh(db_ban)
    return db_ban

# Xóa bàn (Chỉ Admin)
@router.delete("/{id_ban}")
def delete_table(id_ban: int, db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    db_ban = db.query(models.Ban).filter(models.Ban.id_ban == id_ban).first()
    if not db_ban:
        raise HTTPException(status_code=404, detail="Không tìm thấy bàn")
    
    # Có thể kiểm tra xem bàn có đang được đặt không trước khi xóa
    # (Tạm thời cho phép xóa)
    db.delete(db_ban)
    db.commit()
    return {"message": "Xóa bàn thành công"}
