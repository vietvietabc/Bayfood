from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app import models, schemas
from typing import List
from pydantic import BaseModel
from datetime import datetime, timedelta
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
        
        # Lấy ca làm việc nếu là nhân viên
        ca_lam_viec = None
        nv = db.query(models.NhanVien).filter(models.NhanVien.id_nguoiDung == user.id_nguoiDung).first()
        if nv:
            ca_lam_viec = nv.caLamViec
            
        result.append({
            "id_nguoiDung": user.id_nguoiDung,
            "hoTen": user.hoTen,
            "email": user.email,
            "soDienThoai": user.soDienThoai,
            "id_vaiTro": user.id_vaiTro,
            "tenVaiTro": vai_tro.tenVaiTro if vai_tro else None,
            "trangThai": user.trangThai or "Hoạt động",
            "caLamViec": ca_lam_viec,
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


class UpdateStaffShiftRequest(BaseModel):
    caLamViec: str


# Admin cập nhật ca làm việc cho nhân viên
@router.put("/{id_nguoidung}/shift")
def update_staff_shift(
    id_nguoidung: int,
    req: UpdateStaffShiftRequest,
    db: Session = Depends(get_db),
    current_admin: models.NguoiDung = Depends(get_current_admin)
):
    """Admin cập nhật ca làm việc cho nhân viên."""
    user = db.query(models.NguoiDung).filter(models.NguoiDung.id_nguoiDung == id_nguoidung).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")
    
    # Kiểm tra xem có phải nhân viên không
    vai_tro = db.query(models.VaiTro).filter(models.VaiTro.id_vaiTro == user.id_vaiTro).first()
    ten_vai_tro = (vai_tro.tenVaiTro if vai_tro else "").strip().lower()
    allowed_roles = {"nhân viên nhà bếp", "nhân viên phục vụ"}
    if ten_vai_tro not in allowed_roles and user.id_vaiTro not in (3, 4):
        raise HTTPException(status_code=400, detail="Tài khoản này không phải là nhân viên để có ca làm việc")
        
    nv = db.query(models.NhanVien).filter(models.NhanVien.id_nguoiDung == id_nguoidung).first()
    if not nv:
        nv = models.NhanVien(
            id_nguoiDung=id_nguoidung,
            ngayVaoLam=datetime.utcnow() + timedelta(hours=7),
            caLamViec=req.caLamViec,
            trangThai="Nghỉ"
        )
        db.add(nv)
    else:
        nv.caLamViec = req.caLamViec
        
    db.commit()
    return {"message": f"Cập nhật ca làm việc thành công cho {user.hoTen}", "caLamViec": req.caLamViec}


# Admin xem lịch sử ca làm việc
@router.get("/shift-history")
def get_shift_history(
    db: Session = Depends(get_db),
    current_admin: models.NguoiDung = Depends(get_current_admin),
):
    """Lấy lịch sử vào ca / tan ca của tất cả nhân viên."""
    from app.db.database import engine
    from datetime import date as date_type, time as time_type
    models.LichSuCa.__table__.create(bind=engine, checkfirst=True)

    records = (
        db.query(models.LichSuCa)
        .order_by(models.LichSuCa.ngay.desc(), models.LichSuCa.thoiGianVao.desc())
        .limit(100)
        .all()
    )

    today = (datetime.utcnow() + timedelta(hours=7)).date()

    CA_END_TIME = {
        "Ca sáng": time_type(13, 0),
        "Ca chiều": time_type(18, 0),
        "Ca tối": time_type(23, 59),
    }

    needs_commit = False
    result = []
    for r in records:
        nv = db.query(models.NhanVien).filter(models.NhanVien.id_nhanVien == r.id_nhanVien).first()
        nd = db.query(models.NguoiDung).filter(models.NguoiDung.id_nguoiDung == nv.id_nguoiDung).first() if nv else None

        thoiGianRa = r.thoiGianRa
        trang_thai = "Đang làm"

        if thoiGianRa is None and r.ngay < today:
            # Ca cũ chưa tan: tự động điền giờ kết thúc theo loại ca
            end_time = CA_END_TIME.get(r.caLamViec, time_type(23, 59))
            thoiGianRa = datetime.combine(r.ngay, end_time)
            # Lưu vào DB để lần sau không cần tính lại
            r.thoiGianRa = thoiGianRa
            needs_commit = True
            trang_thai = "Hoàn thành"
        elif thoiGianRa is not None:
            trang_thai = "Hoàn thành"

        so_gio = None
        if thoiGianRa is not None and r.thoiGianVao is not None:
            diff = (thoiGianRa - r.thoiGianVao).total_seconds()
            so_gio = round(max(0, diff) / 3600, 1)

        result.append({
            "id": r.id_lichSuCa,
            "hoTen": nd.hoTen if nd else "?",
            "ngay": r.ngay.strftime("%d/%m/%Y") if r.ngay else None,
            "caLamViec": r.caLamViec,
            "thoiGianVao": r.thoiGianVao.strftime("%H:%M") if r.thoiGianVao else None,
            "thoiGianRa": thoiGianRa.strftime("%H:%M") if thoiGianRa else "Chưa tan ca",
            "soGio": so_gio,
            "trangThai": trang_thai,
        })

    if needs_commit:
        db.commit()

    return result


# Nhân viên tự xem lịch sử ca làm việc của mình
@router.get("/me/shift-history")
def get_my_shift_history(
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_user),
):
    
    nv = db.query(models.NhanVien).filter(models.NhanVien.id_nguoiDung == current_user.id_nguoiDung).first()
    if not nv:
        return []

    from app.db.database import engine
    from datetime import date as date_type, time as time_type
    models.LichSuCa.__table__.create(bind=engine, checkfirst=True)

    records = (
        db.query(models.LichSuCa)
        .filter(models.LichSuCa.id_nhanVien == nv.id_nhanVien)
        .order_by(models.LichSuCa.ngay.desc(), models.LichSuCa.thoiGianVao.desc())
        .limit(50)
        .all()
    )

    today = (datetime.utcnow() + timedelta(hours=7)).date()

    # Giờ kết thúc mặc định theo loại ca
    CA_END_TIME = {
        "Ca sáng": time_type(13, 0),
        "Ca chiều": time_type(18, 0),
        "Ca tối": time_type(23, 59),
    }

    needs_commit = False
    result = []
    for r in records:
        thoiGianRa = r.thoiGianRa
        trang_thai = "Đang làm"

        if thoiGianRa is None and r.ngay < today:
            # Ca cũ chưa tan: tự động điền giờ kết thúc theo loại ca
            end_time = CA_END_TIME.get(r.caLamViec, time_type(23, 59))
            thoiGianRa = datetime.combine(r.ngay, end_time)
            # Lưu vào DB để lần sau không cần tính lại
            r.thoiGianRa = thoiGianRa
            needs_commit = True
            trang_thai = "Hoàn thành"
        elif thoiGianRa is not None:
            trang_thai = "Hoàn thành"

        so_gio = None
        if thoiGianRa is not None and r.thoiGianVao is not None:
            diff = (thoiGianRa - r.thoiGianVao).total_seconds()
            so_gio = round(max(0, diff) / 3600, 1)

        result.append({
            "id": r.id_lichSuCa,
            "ngay": r.ngay.strftime("%d/%m/%Y") if r.ngay else None,
            "caLamViec": r.caLamViec,
            "thoiGianVao": r.thoiGianVao.strftime("%H:%M") if r.thoiGianVao else None,
            "thoiGianRa": thoiGianRa.strftime("%H:%M") if thoiGianRa else "Chưa tan ca",
            "soGio": so_gio,
            "trangThai": trang_thai,
        })

    if needs_commit:
        db.commit()

    return result


# Admin xem lịch sử ca làm việc của 1 nhân viên cụ thể
@router.get("/{id_nguoidung}/shift-history")
def get_user_shift_history(
    id_nguoidung: int,
    db: Session = Depends(get_db),
    current_admin: models.NguoiDung = Depends(get_current_admin),
):
    """Lấy lịch sử ca làm việc của 1 nhân viên cụ thể."""
    user = db.query(models.NguoiDung).filter(models.NguoiDung.id_nguoiDung == id_nguoidung).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")

    nv = db.query(models.NhanVien).filter(models.NhanVien.id_nguoiDung == id_nguoidung).first()
    if not nv:
        return []

    from app.db.database import engine
    from datetime import date as date_type, time as time_type
    models.LichSuCa.__table__.create(bind=engine, checkfirst=True)

    records = (
        db.query(models.LichSuCa)
        .filter(models.LichSuCa.id_nhanVien == nv.id_nhanVien)
        .order_by(models.LichSuCa.ngay.desc(), models.LichSuCa.thoiGianVao.desc())
        .limit(50)
        .all()
    )

    today = (datetime.utcnow() + timedelta(hours=7)).date()

    # Giờ kết thúc mặc định theo loại ca
    CA_END_TIME = {
        "Ca sáng": time_type(13, 0),
        "Ca chiều": time_type(18, 0),
        "Ca tối": time_type(23, 59),
    }

    needs_commit = False
    result = []
    for r in records:
        thoiGianRa = r.thoiGianRa
        trang_thai = "Đang làm"

        if thoiGianRa is None and r.ngay < today:
            # Ca cũ chưa tan: tự động điền giờ kết thúc theo loại ca
            end_time = CA_END_TIME.get(r.caLamViec, time_type(23, 59))
            thoiGianRa = datetime.combine(r.ngay, end_time)
            # Lưu vào DB để lần sau không cần tính lại
            r.thoiGianRa = thoiGianRa
            needs_commit = True
            trang_thai = "Hoàn thành"
        elif thoiGianRa is not None:
            trang_thai = "Hoàn thành"

        so_gio = None
        if thoiGianRa is not None and r.thoiGianVao is not None:
            diff = (thoiGianRa - r.thoiGianVao).total_seconds()
            so_gio = round(max(0, diff) / 3600, 1)

        result.append({
            "id": r.id_lichSuCa,
            "hoTen": user.hoTen,
            "ngay": r.ngay.strftime("%d/%m/%Y") if r.ngay else None,
            "caLamViec": r.caLamViec,
            "thoiGianVao": r.thoiGianVao.strftime("%H:%M") if r.thoiGianVao else None,
            "thoiGianRa": thoiGianRa.strftime("%H:%M") if thoiGianRa else "Chưa tan ca",
            "soGio": so_gio,
            "trangThai": trang_thai,
        })

    if needs_commit:
        db.commit()

    return result



