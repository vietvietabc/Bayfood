from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from pathlib import Path
from app.db.database import get_db
from app import models, schemas
from app.api.auth import get_current_admin
import qrcode
import os
from urllib.parse import urlparse
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/ban", tags=["Bàn"])

# ─── In-memory table hold registry ───────────────────────────────────────────
# { id_ban: { "held_by": id_nguoiDung_or_session, "expires_at": datetime } }
_table_holds: dict = {}
HOLD_DURATION_MINUTES = 5

def _clean_expired_holds():
    """Remove holds that have passed their expiry time."""
    now = datetime.utcnow()
    expired = [k for k, v in _table_holds.items() if v["expires_at"] < now]
    for k in expired:
        del _table_holds[k]

def is_table_held(id_ban: int, exclude_session: Optional[str] = None) -> bool:
    """Return True if table is currently held by someone else."""
    _clean_expired_holds()
    hold = _table_holds.get(id_ban)
    if not hold:
        return False
    if exclude_session and hold.get("held_by") == exclude_session:
        return False  # This session owns the hold
    return True



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


import secrets

def build_table_qr_url(id_ban: int, frontend_url: str) -> str:
    token = secrets.token_hex(4)
    qr_data = f"{frontend_url}/menu?table={id_ban}&token={token}"
    QR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    file_name = f"table-{id_ban}-{token}.png"
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
        if not table.maQR_url or "localhost" in table.maQR_url:
            table.maQR_url = build_table_qr_url(table.id_ban, frontend_url)
            updated = True
        else:
            file_name = table.maQR_url.split("/")[-1]
            file_path = QR_UPLOAD_DIR / file_name
            if not file_path.exists():
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
        if not table.maQR_url or "localhost" in table.maQR_url:
            table.maQR_url = build_table_qr_url(table.id_ban, frontend_url)
            updated = True
        else:
            file_name = table.maQR_url.split("/")[-1]
            file_path = QR_UPLOAD_DIR / file_name
            if not file_path.exists():
                table.maQR_url = build_table_qr_url(table.id_ban, frontend_url)
                updated = True
            
    if updated:
        db.commit()
        
    return tables


# ─── Holds Status (must be BEFORE /{id_ban} to avoid "holds" being cast as int) ─
@router.get("/holds/status")
def get_holds_status():
    """Trả về danh sách bàn đang bị giữ."""
    _clean_expired_holds()
    now = datetime.utcnow()
    return {
        "held_tables": [
            {
                "id_ban": k,
                "expires_at": v["expires_at"].isoformat(),
                "remaining_seconds": max(0, int((v["expires_at"] - now).total_seconds()))
            }
            for k, v in _table_holds.items()
            if v["expires_at"] > now
        ]
    }


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


@router.post("/{id_ban}/reset-qr", response_model=schemas.BanResponse)
def reset_table_qr(request: Request, id_ban: int, db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    db_ban = db.query(models.Ban).filter(models.Ban.id_ban == id_ban).first()
    if not db_ban:
        raise HTTPException(status_code=404, detail="Không tìm thấy bàn")
    
    # Delete old file
    if db_ban.maQR_url:
        old_file_name = db_ban.maQR_url.split("/")[-1]
        old_file_path = QR_UPLOAD_DIR / old_file_name
        if old_file_path.exists():
            try:
                old_file_path.unlink()
            except Exception:
                pass
                
    frontend_url = get_frontend_url(request)
    db_ban.maQR_url = build_table_qr_url(db_ban.id_ban, frontend_url)
    db.commit()
    db.refresh(db_ban)
    return db_ban


# ─── Table Hold Endpoints ─────────────────────────────────────────────────────

@router.post("/{id_ban}/hold")
def hold_table(id_ban: int, request: Request, db: Session = Depends(get_db)):
    """
    Giữ chỗ bàn tạm thời (5 phút) khi khách đang chọn.
    Trả về lỗi 409 nếu bàn đang được người khác giữ.
    Dùng IP+UserAgent làm session key (không cần đăng nhập).
    """
    _clean_expired_holds()
    session_key = f"{request.client.host}-{request.headers.get('user-agent', 'unknown')[:50]}"

    # Check if table exists
    table = db.query(models.Ban).filter(models.Ban.id_ban == id_ban).first()
    if not table:
        raise HTTPException(status_code=404, detail="Không tìm thấy bàn")

    # Check current hold
    hold = _table_holds.get(id_ban)
    if hold and hold["expires_at"] > datetime.utcnow() and hold["held_by"] != session_key:
        remaining_seconds = int((hold["expires_at"] - datetime.utcnow()).total_seconds())
        raise HTTPException(
            status_code=409,
            detail=f"Bàn này đang được khách khác xem xét. Vui lòng thử lại sau {remaining_seconds} giây."
        )

    # Set/renew hold
    _table_holds[id_ban] = {
        "held_by": session_key,
        "expires_at": datetime.utcnow() + timedelta(minutes=HOLD_DURATION_MINUTES)
    }

    return {
        "message": "Đã giữ chỗ thành công",
        "id_ban": id_ban,
        "expires_in_seconds": HOLD_DURATION_MINUTES * 60
    }


@router.delete("/{id_ban}/hold")
def release_table_hold(id_ban: int, request: Request):
    """Giải phóng chỗ bàn đang giữ (khi khách huỷ chọn hoặc đặt xong)."""
    session_key = f"{request.client.host}-{request.headers.get('user-agent', 'unknown')[:50]}"
    hold = _table_holds.get(id_ban)
    if hold and hold["held_by"] == session_key:
        del _table_holds[id_ban]
    return {"message": "Đã giải phóng chỗ"}

