from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app import models, schemas
from typing import List
from app.api.auth import get_current_admin, get_current_user
from app.core.security import get_password_hash, verify_password

router = APIRouter(prefix="/api/users", tags=["Người Dùng"])

@router.get("/me/profile", response_model=schemas.UserResponse)
def get_my_profile(db: Session = Depends(get_db), current_user: models.NguoiDung = Depends(get_current_user)):
    vai_tro = db.query(models.VaiTro).filter(models.VaiTro.id_vaiTro == current_user.id_vaiTro).first()
    return {
        "id_nguoiDung": current_user.id_nguoiDung,
        "hoTen": current_user.hoTen,
        "email": current_user.email,
        "soDienThoai": current_user.soDienThoai,
        "id_vaiTro": current_user.id_vaiTro,
        "tenVaiTro": vai_tro.tenVaiTro if vai_tro else None,
        "trangThai": current_user.trangThai or "Hoạt động",
    }

@router.put("/me/profile", response_model=schemas.UserResponse)
def update_my_profile(payload: schemas.UserProfileUpdate, db: Session = Depends(get_db), current_user: models.NguoiDung = Depends(get_current_user)):
    current_user.hoTen = payload.hoTen
    current_user.soDienThoai = payload.soDienThoai
    db.commit()
    db.refresh(current_user)
    vai_tro = db.query(models.VaiTro).filter(models.VaiTro.id_vaiTro == current_user.id_vaiTro).first()
    return {
        "id_nguoiDung": current_user.id_nguoiDung,
        "hoTen": current_user.hoTen,
        "email": current_user.email,
        "soDienThoai": current_user.soDienThoai,
        "id_vaiTro": current_user.id_vaiTro,
        "tenVaiTro": vai_tro.tenVaiTro if vai_tro else None,
        "trangThai": current_user.trangThai or "Hoạt động",
    }

@router.put("/me/password")
def change_my_password(payload: schemas.ChangePasswordRequest, db: Session = Depends(get_db), current_user: models.NguoiDung = Depends(get_current_user)):
    if not verify_password(payload.matKhauCu, current_user.matKhau):
        raise HTTPException(status_code=400, detail="Mật khẩu cũ không chính xác")

    current_user.matKhau = get_password_hash(payload.matKhauMoi)
    db.commit()
    return {"message": "Đổi mật khẩu thành công"}

# Lấy danh sách tất cả người dùng (Admin only)
@router.get("/all/list", response_model=List[schemas.UserResponse])
def get_all_users(db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    users = db.query(models.NguoiDung).order_by(models.NguoiDung.id_nguoiDung.desc()).all()
    result = []
    for user in users:
        vai_tro = db.query(models.VaiTro).filter(models.VaiTro.id_vaiTro == user.id_vaiTro).first()
        result.append({
            "id_nguoiDung": user.id_nguoiDung,
            "hoTen": user.hoTen,
            "email": user.email,
            "soDienThoai": user.soDienThoai,
            "id_vaiTro": user.id_vaiTro,
            "tenVaiTro": vai_tro.tenVaiTro if vai_tro else None,
            "trangThai": user.trangThai or "Hoạt động",
        })
    return result

# Admin tạo tài khoản nhân viên (phục vụ hoặc bếp)
@router.post("/staff", response_model=schemas.UserResponse)
def create_staff(staff: schemas.StaffCreate, db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    # Kiểm tra email đã tồn tại
    existing = db.query(models.NguoiDung).filter(models.NguoiDung.email == staff.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email đã được đăng ký")

    # Map loại nhân viên sang tên vai trò
    ten_vai_tro_map = {
        "nv_phuc_vu": "Nhân viên phục vụ",
        "nv_bep": "Nhân viên nhà bếp",
    }
    ten_vai_tro = ten_vai_tro_map[staff.vaiTro]

    # Lấy hoặc tạo vai trò
    vai_tro = db.query(models.VaiTro).filter(models.VaiTro.tenVaiTro == ten_vai_tro).first()
    if not vai_tro:
        vai_tro = models.VaiTro(tenVaiTro=ten_vai_tro)
        db.add(vai_tro)
        db.commit()
        db.refresh(vai_tro)

    hashed_password = get_password_hash(staff.matKhau)
    new_user = models.NguoiDung(
        hoTen=staff.hoTen,
        email=staff.email,
        soDienThoai=staff.soDienThoai,
        matKhau=hashed_password,
        id_vaiTro=vai_tro.id_vaiTro,
        trangThai="Hoạt động",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "id_nguoiDung": new_user.id_nguoiDung,
        "hoTen": new_user.hoTen,
        "email": new_user.email,
        "soDienThoai": new_user.soDienThoai,
        "id_vaiTro": new_user.id_vaiTro,
        "tenVaiTro": vai_tro.tenVaiTro,
        "trangThai": new_user.trangThai,
    }

# Admin ban tài khoản
@router.put("/{id_nguoidung}/ban")
def ban_user(id_nguoidung: int, db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    user = db.query(models.NguoiDung).filter(models.NguoiDung.id_nguoiDung == id_nguoidung).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")
    if user.id_nguoiDung == current_admin.id_nguoiDung:
        raise HTTPException(status_code=400, detail="Không thể tự ban tài khoản của mình")
    user.trangThai = "Bị khóa"
    db.commit()
    return {"message": f"Đã khóa tài khoản {user.hoTen}"}

# Admin unban tài khoản
@router.put("/{id_nguoidung}/unban")
def unban_user(id_nguoidung: int, db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    user = db.query(models.NguoiDung).filter(models.NguoiDung.id_nguoiDung == id_nguoidung).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")
    user.trangThai = "Hoạt động"
    db.commit()
    return {"message": f"Đã mở khóa tài khoản {user.hoTen}"}
