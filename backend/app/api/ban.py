from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from pathlib import Path
from app.db.database import get_db
from app import models, schemas
from app.api.auth import get_current_admin
import qrcode
import os
from urllib.parse import urlparse

router = APIRouter(prefix="/api/ban", tags=["Bàn"])

QR_UPLOAD_DIR = Path("app/static/uploads/tables/qrcodes")


def get_frontend_url(request: Request) -> str:
    """Tự động phát hiện tên miền Frontend (Vercel hoặc Localhost) từ HTTP Header."""
    # 1. Ưu tiên biến môi trường nếu có cấu hình
    env_url = os.getenv("FRONTEND_URL")
    if env_url:
        return env_url.strip().rstrip("/")
        
    # 2. Đọc từ Origin Header (Yêu cầu liên mạng CORS)
    origin = request.headers.get("origin")
    if origin:
        return origin.strip().rstrip("/")
        
    # 3. Đọc từ Referer Header (Trang web bắt đầu cuộc gọi)
    referer = request.headers.get("referer")
    if referer:
        parsed = urlparse(referer)
        return f"{parsed.scheme}://{parsed.netloc}".rstrip("/")
        
    # 4. Fallback mặc định
    return "http://localhost:5173"


def build_table_qr_url(id_ban: int, frontend_url: str) -> str:
    qr_data = f"{frontend_url}/menu?table={id_ban}"
    QR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    file_name = f"table-{id_ban}.png"
    file_path = QR_UPLOAD_DIR / file_name

    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=4)
    qr.add_data(qr_data)
    qr.make(fit=True)

    image = qr.make_image(fill_color="black", back_color="white")
    image.save(file_path)

    # Trả về đường dẫn tương đối để frontend tự động ghép với domain backend hiện tại
    return f"/static/uploads/tables/qrcodes/{file_name}"


# Lấy danh sách toàn bộ bàn (Public để khách cũng xem được bàn trống)
@router.get("/", response_model=List[schemas.BanResponse])
def get_all_tables(request: Request, db: Session = Depends(get_db)):
    tables = db.query(models.Ban).all()
    frontend_url = get_frontend_url(request)
    updated = False
    
    for table in tables:
        file_name = f"table-{table.id_ban}.png"
        file_path = QR_UPLOAD_DIR / file_name
        
        # Cơ chế Auto-Healing: Nếu file ảnh vật lý bị mất trên Render hoặc link DB chứa localhost cũ
        if not file_path.exists() or not table.maQR_url or "localhost" in table.maQR_url:
            table.maQR_url = build_table_qr_url(table.id_ban, frontend_url)
            updated = True
            
    if updated:
        db.commit()
        
    return tables


@router.get("/available", response_model=List[schemas.BanResponse])
def get_available_tables(request: Request, db: Session = Depends(get_db)):
    tables = db.query(models.Ban).filter(models.Ban.trangThai == "Trống").all()
    frontend_url = get_frontend_url(request)
    updated = False
    
    for table in tables:
        file_name = f"table-{table.id_ban}.png"
        file_path = QR_UPLOAD_DIR / file_name
        
        if not file_path.exists() or not table.maQR_url or "localhost" in table.maQR_url:
            table.maQR_url = build_table_qr_url(table.id_ban, frontend_url)
            updated = True
            
    if updated:
        db.commit()
        
    return tables


# Thêm bàn mới (Chỉ Admin)
@router.post("/", response_model=schemas.BanResponse)
def create_table(request: Request, ban: schemas.BanCreate, db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    db_ban = models.Ban(
        tenBan=ban.tenBan,
        sucChua=ban.sucChua,
        viTri=ban.viTri,
        hinhAnh=ban.hinhAnh,
        trangThai=ban.trangThai,
        tienCocMacDinh=ban.tienCocMacDinh if ban.tienCocMacDinh is not None else 0
    )
    db.add(db_ban)
    db.flush()
    
    frontend_url = get_frontend_url(request)
    db_ban.maQR_url = build_table_qr_url(db_ban.id_ban, frontend_url)
    db.commit()
    db.refresh(db_ban)
    return db_ban

# Sửa thông tin bàn (Chỉ Admin)
@router.put("/{id_ban}", response_model=schemas.BanResponse)
def update_table(request: Request, id_ban: int, ban: schemas.BanCreate, db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    db_ban = db.query(models.Ban).filter(models.Ban.id_ban == id_ban).first()
    if not db_ban:
        raise HTTPException(status_code=404, detail="Không tìm thấy bàn")
    
    db_ban.tenBan = ban.tenBan
    db_ban.sucChua = ban.sucChua
    db_ban.viTri = ban.viTri
    db_ban.hinhAnh = ban.hinhAnh
    db_ban.trangThai = ban.trangThai
    db_ban.tienCocMacDinh = ban.tienCocMacDinh if ban.tienCocMacDinh is not None else 0
    
    frontend_url = get_frontend_url(request)
    db_ban.maQR_url = build_table_qr_url(db_ban.id_ban, frontend_url)
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
