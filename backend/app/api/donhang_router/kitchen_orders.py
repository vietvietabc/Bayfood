from decimal import Decimal
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app import models, schemas
from app.api.auth import get_current_admin, get_current_user
from app.db.database import get_db


router = APIRouter()

from .utils import get_current_kitchen_or_admin, get_current_waiter_or_admin, _build_order_detail
from .utils import QROrderRequest, DonHangEditInitiateRequest, OrderStatusUpdate, ItemStatusUpdate, ShiftCheckInRequest, ShiftCheckOutRequest

@router.get("/kitchen/upcoming")
def get_kitchen_upcoming_orders(
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_kitchen_or_admin),
):
    """Lấy danh sách đơn hàng sắp tới (đặt trước, chưa check-in) cho bếp chuẩn bị."""
    local_now = datetime.utcnow() + timedelta(hours=7)
    start_of_today = local_now.replace(hour=0, minute=0, second=0, microsecond=0)

    upcoming_orders = (
        db.query(models.DonHang)
        .filter(
            models.DonHang.tinhTrang == "Chờ khách đến",
            models.DonHang.thoiGianDen >= start_of_today,
        )
        .order_by(models.DonHang.thoiGianDen.asc())
        .all()
    )

    result = []
    for order in upcoming_orders:
        khach = db.query(models.NguoiDung).filter(
            models.NguoiDung.id_nguoiDung == order.id_nguoiDung
        ).first()

        ten_ban = None
        so_nguoi = None
        ghi_chu = None
        if order.id_datBan:
            dat_ban = db.query(models.DatBan).filter(
                models.DatBan.id_datBan == order.id_datBan
            ).first()
            if dat_ban:
                so_nguoi = dat_ban.soNguoi
                ghi_chu = dat_ban.ghiChu
        if order.id_ban:
            ban = db.query(models.Ban).filter(models.Ban.id_ban == order.id_ban).first()
            ten_ban = ban.tenBan if ban else f"Bàn {order.id_ban}"

        chi_tiets = db.query(models.ChiTietDonHang).filter(
            models.ChiTietDonHang.id_donHang == order.id_donHang
        ).all()
        items = []
        tong_tien = Decimal("0")
        for ct in chi_tiets:
            mon = db.query(models.ThucDon).filter(models.ThucDon.id_monAn == ct.id_monAn).first()
            gia = ct.giaTaiThoiDiemBan or Decimal("0")
            so_luong = ct.soLuong or 0
            tong_tien += gia * so_luong
            items.append({
                "tenMon": mon.tenMon if mon else f"Món #{ct.id_monAn}",
                "soLuong": so_luong,
                "giaTaiThoiDiemBan": float(gia),
                "hinhAnh": mon.hinhAnh if mon else None,
            })

        so_phut_con_lai = 0
        if order.thoiGianDen:
            delta = order.thoiGianDen - local_now
            so_phut_con_lai = max(0, int(delta.total_seconds() / 60))

        result.append({
            "id_donHang": order.id_donHang,
            "id_ban": order.id_ban,
            "tenBan": ten_ban,
            "tenKhach": khach.hoTen if khach else None,
            "thoiGianDen": order.thoiGianDen.isoformat() if order.thoiGianDen else None,
            "soNguoi": so_nguoi,
            "ghiChu": ghi_chu,
            "chi_tiet": items,
            "tongTien": float(tong_tien),
            "soPhutConLai": so_phut_con_lai,
        })
    return result


@router.get("/kitchen/active")
def get_kitchen_orders(
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_kitchen_or_admin),
):
    """Lấy danh sách đơn hàng đang hoạt động trong bếp (Đang chờ món + Đang chế biến)."""
    active_orders = (
        db.query(models.DonHang)
        .filter(models.DonHang.tinhTrang.in_(["Đang chờ món", "Đang chế biến"]))
        .order_by(models.DonHang.thoiGianTao.asc())
        .all()
    )
    result = []
    for order in active_orders:
        chi_tiets = (
            db.query(models.ChiTietDonHang)
            .filter(
                models.ChiTietDonHang.id_donHang == order.id_donHang,
                models.ChiTietDonHang.trangThaiMon != "Đã hủy"  # Bếp chỉ thấy món active
            )
            .all()
        )
        items = []
        for ct in chi_tiets:
            mon = db.query(models.ThucDon).filter(models.ThucDon.id_monAn == ct.id_monAn).first()
            items.append({
                "id_chiTietDonHang": ct.id_chiTietDonHang,
                "id_monAn": ct.id_monAn,
                "tenMon": mon.tenMon if mon else f"Món #{ct.id_monAn}",
                "hinhAnh": mon.hinhAnh if mon else None,
                "soLuong": ct.soLuong,
                "trangThaiMon": ct.trangThaiMon,
                "ghiChu": getattr(ct, "ghiChu", None),
            })
        result.append({
            "id_donHang": order.id_donHang,
            "id_ban": order.id_ban,
            "thoiGianTao": order.thoiGianTao,
            "tinhTrang": order.tinhTrang,
            "chi_tiet": items,
        })
    return result


@router.get("/kitchen/history")
def get_kitchen_history(
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_kitchen_or_admin),
):
    """Lấy lịch sử đơn hàng đã làm hoàn thành trong bếp (Đã phục vụ + Đã thanh toán)."""
    # Tự động thực hiện hot-migration nếu chưa có cột thoiGianHoanThanh
    try:
        from sqlalchemy import text
        db.execute(text("ALTER TABLE DONHANG ADD COLUMN thoiGianHoanThanh DATETIME NULL"))
        db.commit()
    except Exception:
        pass

    nv = db.query(models.NhanVien).filter(models.NhanVien.id_nguoiDung == current_user.id_nguoiDung).first()
    id_nv_hien_tai = nv.id_nhanVien if nv else None

    if not id_nv_hien_tai:
        return []

    # Tìm các mã đơn hàng mà đầu bếp này đã trực tiếp chế biến ít nhất 1 món
    cooked_order_ids = (
        db.query(models.ChiTietDonHang.id_donHang)
        .filter(models.ChiTietDonHang.id_nhanVien == id_nv_hien_tai)
        .distinct()
        .all()
    )
    order_ids = [r[0] for r in cooked_order_ids]

    if not order_ids:
        return []

    completed_orders = (
        db.query(models.DonHang)
        .filter(
            models.DonHang.tinhTrang.in_(["Đã phục vụ", "Đã thanh toán"]),
            models.DonHang.id_donHang.in_(order_ids)
        )
        .order_by(models.DonHang.thoiGianTao.desc())
        .limit(30)
        .all()
    )

    result = []
    for order in completed_orders:
        chi_tiets = (
            db.query(models.ChiTietDonHang)
            .filter(models.ChiTietDonHang.id_donHang == order.id_donHang)
            .all()
        )
        
        has_cooked_item = False
        items = []
        for ct in chi_tiets:
            mon = db.query(models.ThucDon).filter(models.ThucDon.id_monAn == ct.id_monAn).first()
            
            # Lấy tên đầu bếp chế biến
            ten_nv_bep = None
            if ct.id_nhanVien:
                nv_bep = db.query(models.NhanVien).filter(models.NhanVien.id_nhanVien == ct.id_nhanVien).first()
                if nv_bep:
                    nd_bep = db.query(models.NguoiDung).filter(models.NguoiDung.id_nguoiDung == nv_bep.id_nguoiDung).first()
                    ten_nv_bep = nd_bep.hoTen if nd_bep else None

            is_my_item = (ct.id_nhanVien == id_nv_hien_tai) if id_nv_hien_tai else False
            if is_my_item:
                has_cooked_item = True

            items.append({
                "id_chiTietDonHang": ct.id_chiTietDonHang,
                "id_monAn": ct.id_monAn,
                "tenMon": mon.tenMon if mon else f"Món #{ct.id_monAn}",
                "hinhAnh": mon.hinhAnh if mon else None,
                "soLuong": ct.soLuong,
                "trangThaiMon": ct.trangThaiMon,
                "tenNhanVienBep": ten_nv_bep,
                "isMyItem": is_my_item,
            })

        result.append({
            "id_donHang": order.id_donHang,
            "id_ban": order.id_ban,
            "thoiGianTao": order.thoiGianTao,
            "thoiGianHoanThanh": order.thoiGianHoanThanh,
            "tinhTrang": order.tinhTrang,
            "hasCookedItem": has_cooked_item,
            "chi_tiet": items,
        })
        
    return result


@router.get("/kitchen/upcoming")
def get_kitchen_upcoming_orders(
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_kitchen_or_admin),
):
    """Danh sách đơn hàng sắp tới (pre-order chưa checkin) cho bếp."""
    return _build_upcoming_orders(db)


@router.put("/kitchen/item/{id_chiTiet}/status")
def update_item_status(
    id_chiTiet: int,
    req: ItemStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_kitchen_or_admin),
):
    """Cập nhật trạng thái chế biến của 1 món ăn (Chờ chế biến → Đang chế biến → Hoàn thành)."""
    # Kiểm tra ca làm việc đối với nhân viên nhà bếp
    vai_tro = db.query(models.VaiTro).filter(models.VaiTro.id_vaiTro == current_user.id_vaiTro).first()
    ten_vai_tro = (vai_tro.tenVaiTro if vai_tro else "").strip().lower()
    if ten_vai_tro == "nhân viên nhà bếp":
        nv = db.query(models.NhanVien).filter(models.NhanVien.id_nguoiDung == current_user.id_nguoiDung).first()
        if not nv or nv.trangThai != "Đang làm":
            raise HTTPException(
                status_code=400,
                detail="Bạn chưa vào ca làm việc! Vui lòng vào ca trước khi thực hiện nấu món."
            )

    ct = db.query(models.ChiTietDonHang).filter(models.ChiTietDonHang.id_chiTietDonHang == id_chiTiet).first()
    if not ct:
        raise HTTPException(status_code=404, detail="Không tìm thấy chi tiết đơn hàng")

    ct.trangThaiMon = req.trangThaiMon

    # Ghi nhận đầu bếp thực hiện chế biến món này
    nv = db.query(models.NhanVien).filter(models.NhanVien.id_nguoiDung == current_user.id_nguoiDung).first()
    if nv:
        ct.id_nhanVien = nv.id_nhanVien

    # Tự động cập nhật trạng thái đơn hàng
    order = db.query(models.DonHang).filter(models.DonHang.id_donHang == ct.id_donHang).first()
    if order:
        all_items = db.query(models.ChiTietDonHang).filter(
            models.ChiTietDonHang.id_donHang == ct.id_donHang
        ).all()
        statuses = {item.trangThaiMon for item in all_items}

        if statuses == {"Hoàn thành"}:
            order.tinhTrang = "Đã phục vụ"
            order.thoiGianHoanThanh = models.get_vn_time()
        elif "Đang chế biến" in statuses or "Hoàn thành" in statuses:
            order.tinhTrang = "Đang chế biến"

    db.commit()
    return {"message": "Cập nhật thành công", "trangThaiMon": req.trangThaiMon}


@router.get("/kitchen/shift")
def get_kitchen_shift(
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_kitchen_or_admin),
):
    """Lấy thông tin ca làm việc hiện tại của nhân viên bếp."""
    nv = db.query(models.NhanVien).filter(models.NhanVien.id_nguoiDung == current_user.id_nguoiDung).first()
    if not nv:
        # Tự động tạo bản ghi nhân viên nếu chưa có
        nv = models.NhanVien(
            id_nguoiDung=current_user.id_nguoiDung,
            ngayVaoLam=datetime.utcnow() + timedelta(hours=7),
            caLamViec=None,
            trangThai="Nghỉ"
        )
        db.add(nv)
        db.commit()
        db.refresh(nv)
    
    return {
        "id_nhanVien": nv.id_nhanVien,
        "id_nguoiDung": nv.id_nguoiDung,
        "hoTen": current_user.hoTen,
        "caLamViec": nv.caLamViec,
        "trangThai": nv.trangThai,
        "ngayVaoLam": nv.ngayVaoLam,
    }


@router.post("/kitchen/shift/checkin")
def kitchen_shift_checkin(
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_kitchen_or_admin),
):
    """Check-in vào ca làm việc cho nhân viên bếp (kiểm tra ca được gán bởi Admin và đúng khung giờ)."""
    nv = db.query(models.NhanVien).filter(models.NhanVien.id_nguoiDung == current_user.id_nguoiDung).first()
    if not nv or not nv.caLamViec:
        raise HTTPException(
            status_code=400, 
            detail="Bạn chưa được Quản lý phân chia ca làm việc. Vui lòng liên hệ Quản lý để được phân ca."
        )
    
    # Định nghĩa khung giờ ca làm việc (theo giờ Việt Nam UTC+7)
    shift_hours = {
        "Ca sáng": {"start": 7, "end": 12, "time_str": "07:00 - 12:00"},
        "Ca chiều": {"start": 12, "end": 17, "time_str": "12:00 - 17:00"},
        "Ca tối": {"start": 17, "end": 24, "time_str": "17:00 - 24:00"},
    }
    
    assigned_shift = nv.caLamViec.strip()
    if assigned_shift not in shift_hours:
        # Nếu ca gán không nằm trong danh sách chuẩn, cho phép checkin trực tiếp
        nv.trangThai = "Đang làm"
        db.commit()
        db.refresh(nv)
        return {
            "message": "Check-in thành công",
            "caLamViec": nv.caLamViec,
            "trangThai": nv.trangThai
        }
        
    local_now = datetime.utcnow() + timedelta(hours=7)
    current_hour = local_now.hour
    
    config = shift_hours[assigned_shift]
    start_h = config["start"]
    end_h = config["end"]
    
    if not (start_h <= current_hour < end_h):
        raise HTTPException(
            status_code=400,
            detail=f"Không thể vào ca! Ca làm việc của bạn là {assigned_shift} ({config['time_str']}). Hiện tại là {local_now.strftime('%H:%M')}, không đúng khung giờ của ca này."
        )
        
    nv.trangThai = "Đang làm"
    db.commit()
    db.refresh(nv)

    # Ghi lịch sử check-in
    local_now = datetime.utcnow() + timedelta(hours=7)
    from app.db.database import engine
    models.LichSuCa.__table__.create(bind=engine, checkfirst=True)
    lich_su = models.LichSuCa(
        id_nhanVien=nv.id_nhanVien,
        ngay=local_now.date(),
        caLamViec=nv.caLamViec,
        thoiGianVao=local_now,
        thoiGianRa=None,
    )
    db.add(lich_su)
    db.commit()

    return {
        "message": "Check-in thành công",
        "caLamViec": nv.caLamViec,
        "trangThai": nv.trangThai
    }
    
    


@router.post("/kitchen/shift/checkout")
def kitchen_shift_checkout(
    req: ShiftCheckOutRequest = None,
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_kitchen_or_admin),
):
    """Tan ca / Check-out ca làm việc."""
    nv = db.query(models.NhanVien).filter(models.NhanVien.id_nguoiDung == current_user.id_nguoiDung).first()
    if not nv:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin nhân viên")

    nv.trangThai = "Nghỉ"

    # Đảm bảo bảng LICHSUCA đã được tạo
    from app.db.database import engine
    models.LichSuCa.__table__.create(bind=engine, checkfirst=True)

    # Ghi thời gian tan ca vào bản ghi LichSuCa đang mở hôm nay
    local_now = datetime.utcnow() + timedelta(hours=7)
    today = local_now.date()
    try:
        lich_su = (
            db.query(models.LichSuCa)
            .filter(
                models.LichSuCa.id_nhanVien == nv.id_nhanVien,
                models.LichSuCa.ngay == today,
                models.LichSuCa.thoiGianRa == None,
            )
            .order_by(models.LichSuCa.thoiGianVao.desc())
            .first()
        )
        if lich_su:
            lich_su.thoiGianRa = local_now
    except Exception as e:
        print("Lỗi ghi lịch sử ca:", e)
        db.rollback()  # Rollback nếu transaction bị lỗi để tránh ảnh hưởng đến các lệnh sau

    db.commit()
    db.refresh(nv)

    return {
        "message": "Tan ca thành công",
        "caLamViec": nv.caLamViec,
        "trangThai": nv.trangThai,
        "thoiGianRa": local_now.strftime("%H:%M %d/%m/%Y"),
    }

