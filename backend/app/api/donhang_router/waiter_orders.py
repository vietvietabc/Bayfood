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

@router.get("/waiter/upcoming")
def get_waiter_upcoming_orders(
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_waiter_or_admin),
):
    """Lấy danh sách đơn hàng sắp tới (đặt trước, chưa check-in) cho phục vụ."""
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
        # Lấy thông tin khách hàng
        khach = db.query(models.NguoiDung).filter(
            models.NguoiDung.id_nguoiDung == order.id_nguoiDung
        ).first()

        # Lấy thông tin đặt bàn
        dat_ban = None
        ten_ban = None
        so_nguoi = None
        ghi_chu = None
        trang_thai_dat_ban = None
        trang_thai_coc = None
        tien_coc = 0.0
        if order.id_datBan:
            dat_ban = db.query(models.DatBan).filter(
                models.DatBan.id_datBan == order.id_datBan
            ).first()
            if dat_ban:
                so_nguoi = dat_ban.soNguoi
                ghi_chu = dat_ban.ghiChu
                trang_thai_dat_ban = dat_ban.trangThai
                trang_thai_coc = dat_ban.trangThaiCoc
                tien_coc = float(dat_ban.tienCoc) if dat_ban.tienCoc else 0.0

        # Lấy tên bàn
        if order.id_ban:
            ban = db.query(models.Ban).filter(models.Ban.id_ban == order.id_ban).first()
            ten_ban = ban.tenBan if ban else f"Bàn {order.id_ban}"

        # Lấy chi tiết món ăn
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

        # Tính số phút còn lại trước giờ hẹn
        so_phut_con_lai = 0
        if order.thoiGianDen:
            delta = order.thoiGianDen - local_now
            so_phut_con_lai = max(0, int(delta.total_seconds() / 60))

        result.append({
            "id_donHang": order.id_donHang,
            "id_ban": order.id_ban,
            "tenBan": ten_ban,
            "tenKhach": khach.hoTen if khach else None,
            "soDienThoai": khach.soDienThoai if khach else None,
            "thoiGianDen": order.thoiGianDen.isoformat() if order.thoiGianDen else None,
            "soNguoi": so_nguoi,
            "ghiChu": ghi_chu,
            "trangThaiDatBan": trang_thai_dat_ban,
            "trangThaiCoc": trang_thai_coc,
            "tienCoc": tien_coc,
            "chi_tiet": items,
            "tongTien": float(tong_tien),
            "soPhutConLai": so_phut_con_lai,
        })
    return result


@router.get("/waiter/active")
def get_waiter_orders(
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_waiter_or_admin),
):
    """Lấy danh sách đơn hàng đang hoạt động cho nhân viên phục vụ (đơn của mình hoặc đơn chưa có ai nhận)."""
    nv = db.query(models.NhanVien).filter(
        models.NhanVien.id_nguoiDung == current_user.id_nguoiDung
    ).first()

    active_statuses = ["Đang chờ món", "Đang chế biến", "Đã phục vụ"]
    
    # Kiểm tra vai trò
    vai_tro = db.query(models.VaiTro).filter(models.VaiTro.id_vaiTro == current_user.id_vaiTro).first()
    ten_vai_tro = (vai_tro.tenVaiTro if vai_tro else "").strip().lower()
    
    query = db.query(models.DonHang).filter(models.DonHang.tinhTrang.in_(active_statuses))
    
    # Nếu là phục vụ (không phải admin/quản lý), chỉ hiện đơn của mình hoặc chưa có ai nhận
    if ten_vai_tro == "nhân viên phục vụ" and nv:
        from sqlalchemy import or_
        query = query.filter(or_(models.DonHang.id_nhanVien == nv.id_nhanVien, models.DonHang.id_nhanVien == None))
        
    active_orders = query.order_by(models.DonHang.thoiGianTao.asc()).all()
    
    result = []
    for order in active_orders:
        is_my_order = nv and order.id_nhanVien == nv.id_nhanVien
        is_unassigned = order.id_nhanVien is None
        
        chi_tiets = db.query(models.ChiTietDonHang).filter(
            models.ChiTietDonHang.id_donHang == order.id_donHang,
            models.ChiTietDonHang.trangThaiMon != "Đã hủy"  # Chỉ hiển món đang active
        ).all()
        items = []
        tong_tien = Decimal("0")
        for ct in chi_tiets:
            mon = db.query(models.ThucDon).filter(models.ThucDon.id_monAn == ct.id_monAn).first()
            gia = ct.giaTaiThoiDiemBan or Decimal("0")
            so_luong = ct.soLuong or 0
            tong_tien += gia * so_luong
            
            items.append({
                "id_chiTietDonHang": ct.id_chiTietDonHang,
                "id_monAn": ct.id_monAn,
                "tenMon": mon.tenMon if mon else f"Món #{ct.id_monAn}",
                "hinhAnh": mon.hinhAnh if mon else None,
                "soLuong": so_luong,
                "giaTaiThoiDiemBan": float(gia),
                "trangThaiMon": ct.trangThaiMon,
            })

        khach = db.query(models.NguoiDung).filter(
            models.NguoiDung.id_nguoiDung == order.id_nguoiDung
        ).first()

        # Lấy thông tin cọc đặt bàn tương ứng
        tien_coc = 0.0
        trang_thai_coc = None
        if order.id_datBan:
            db_res = db.query(models.DatBan).filter(models.DatBan.id_datBan == order.id_datBan).first()
            if db_res:
                tien_coc = float(db_res.tienCoc) if db_res.tienCoc else 0.0
                trang_thai_coc = db_res.trangThaiCoc

        # Lấy tổng thanh toán từ bảng ThanhToan
        payments = db.query(models.ThanhToan).filter(models.ThanhToan.id_donHang == order.id_donHang).all()
        tong_thanh_toan = float(sum(p.soTienThanhToan for p in payments)) if payments else 0.0

        result.append({
            "id_donHang": order.id_donHang,
            "id_ban": order.id_ban,
            "tenKhachHang": khach.hoTen if khach else None,
            "thoiGianTao": order.thoiGianTao,
            "tinhTrang": order.tinhTrang,
            "id_nhanVien": order.id_nhanVien,
            "isMyOrder": is_my_order,
            "isUnassigned": is_unassigned,
            "chi_tiet": items,
            "tongTien": float(tong_tien),
            "tienCoc": tien_coc,
            "trangThaiCoc": trang_thai_coc,
            "tongThanhToan": tong_thanh_toan,
        })
    return result



@router.get("/waiter/history")
def get_waiter_history(
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_waiter_or_admin),
):
    """Lịch sử đơn hàng đã phục vụ/thanh toán (30 đơn gần nhất của chính phục vụ đó)."""
    nv = db.query(models.NhanVien).filter(
        models.NhanVien.id_nguoiDung == current_user.id_nguoiDung
    ).first()

    # Kiểm tra vai trò
    vai_tro = db.query(models.VaiTro).filter(models.VaiTro.id_vaiTro == current_user.id_vaiTro).first()
    ten_vai_tro = (vai_tro.tenVaiTro if vai_tro else "").strip().lower()

    query = db.query(models.DonHang).filter(models.DonHang.tinhTrang == "Đã thanh toán")

    # Nếu là phục vụ (không phải quản lý), chỉ hiện đơn do chính mình phụ trách
    if ten_vai_tro == "nhân viên phục vụ" and nv:
        query = query.filter(models.DonHang.id_nhanVien == nv.id_nhanVien)

    done_orders = (
        query.order_by(models.DonHang.id_donHang.desc())
        .limit(30)
        .all()
    )
    result = []
    for order in done_orders:
        is_mine = nv and order.id_nhanVien == nv.id_nhanVien
        chi_tiets = db.query(models.ChiTietDonHang).filter(
            models.ChiTietDonHang.id_donHang == order.id_donHang,
            models.ChiTietDonHang.trangThaiMon != "Đã hủy"  # Chỉ hiển món đang active
        ).all()
        items = []
        tong_tien = Decimal("0")
        for ct in chi_tiets:
            mon = db.query(models.ThucDon).filter(models.ThucDon.id_monAn == ct.id_monAn).first()
            gia = ct.giaTaiThoiDiemBan or Decimal("0")
            so_luong = ct.soLuong or 0
            tong_tien += gia * so_luong
            items.append({
                "id_chiTietDonHang": ct.id_chiTietDonHang,
                "id_monAn": ct.id_monAn,
                "tenMon": mon.tenMon if mon else f"Món #{ct.id_monAn}",
                "hinhAnh": mon.hinhAnh if mon else None,
                "soLuong": so_luong,
                "giaTaiThoiDiemBan": float(gia),
                "trangThaiMon": ct.trangThaiMon,
            })
        khach = db.query(models.NguoiDung).filter(
            models.NguoiDung.id_nguoiDung == order.id_nguoiDung
        ).first()

        # Lấy tổng thanh toán từ bảng ThanhToan
        payments = db.query(models.ThanhToan).filter(models.ThanhToan.id_donHang == order.id_donHang).all()
        tong_thanh_toan = float(sum(p.soTienThanhToan for p in payments)) if payments else 0.0

        # Lấy thông tin cọc từ đặt bàn (nếu có)
        tien_coc = 0.0
        trang_thai_coc = None
        if order.id_datBan:
            db_res = db.query(models.DatBan).filter(models.DatBan.id_datBan == order.id_datBan).first()
            if db_res:
                tien_coc = float(db_res.tienCoc or 0)
                trang_thai_coc = db_res.trangThaiCoc

        result.append({
            "id_donHang": order.id_donHang,
            "id_ban": order.id_ban,
            "tenKhachHang": khach.hoTen if khach else None,
            "thoiGianTao": order.thoiGianTao,
            "thoiGianHoanThanh": order.thoiGianHoanThanh,
            "tinhTrang": order.tinhTrang,
            "isMyOrder": is_mine,
            "soMon": len(items),
            "tongTien": float(tong_tien),
            "tongThanhToan": tong_thanh_toan,
            "tienCoc": tien_coc,
            "trangThaiCoc": trang_thai_coc,
            "chi_tiet": items,
        })
    return result


def _build_upcoming_orders(db: Session):
    """Helper: trả về danh sách đơn hàng sắp tới (Chờ khách đến, thoiGianDen >= hôm nay)."""
    local_now = datetime.utcnow() + timedelta(hours=7)
    start_of_today = local_now.replace(hour=0, minute=0, second=0, microsecond=0)

    orders = (
        db.query(models.DonHang)
        .filter(
            models.DonHang.tinhTrang == "Chờ khách đến",
            models.DonHang.thoiGianDen >= start_of_today,
        )
        .order_by(models.DonHang.thoiGianDen.asc())
        .all()
    )

    result = []
    for order in orders:
        # Thông tin khách hàng
        khach = db.query(models.NguoiDung).filter(
            models.NguoiDung.id_nguoiDung == order.id_nguoiDung
        ).first()

        # Thông tin bàn
        ban = None
        if order.id_ban:
            ban = db.query(models.Ban).filter(models.Ban.id_ban == order.id_ban).first()

        # Thông tin đặt bàn
        dat_ban = None
        if order.id_datBan:
            dat_ban = db.query(models.DatBan).filter(
                models.DatBan.id_datBan == order.id_datBan
            ).first()

        # Chi tiết món ăn (chỉ hiển món active, không hiển lịch sử)
        chi_tiets = db.query(models.ChiTietDonHang).filter(
            models.ChiTietDonHang.id_donHang == order.id_donHang,
            models.ChiTietDonHang.trangThaiMon != "Đã hủy"
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

        # Tính số phút còn lại
        so_phut_con_lai = None
        if order.thoiGianDen:
            delta = order.thoiGianDen - local_now
            so_phut_con_lai = int(delta.total_seconds() / 60)

        result.append({
            "id_donHang": order.id_donHang,
            "id_ban": order.id_ban,
            "tenBan": ban.tenBan if ban else None,
            "tenKhach": khach.hoTen if khach else None,
            "soDienThoai": khach.soDienThoai if khach else None,
            "thoiGianDen": order.thoiGianDen,
            "soNguoi": dat_ban.soNguoi if dat_ban else None,
            "ghiChu": dat_ban.ghiChu if dat_ban else None,
            "trangThaiDatBan": dat_ban.trangThai if dat_ban else None,
            "trangThaiCoc": dat_ban.trangThaiCoc if dat_ban else None,
            "tienCoc": float(dat_ban.tienCoc) if (dat_ban and dat_ban.tienCoc) else 0,
            "chi_tiet": items,
            "tongTien": float(tong_tien),
            "soPhutConLai": so_phut_con_lai,
        })

    return result


# ============================================================
# WAITER SHIFT ENDPOINTS
# ============================================================

@router.get("/waiter/shift")
def get_waiter_shift(
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_waiter_or_admin),
):
    """Lấy thông tin ca làm việc hiện tại của nhân viên phục vụ."""
    nv = db.query(models.NhanVien).filter(models.NhanVien.id_nguoiDung == current_user.id_nguoiDung).first()
    if not nv:
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
        "hoTen": current_user.hoTen,
        "caLamViec": nv.caLamViec,
        "trangThai": nv.trangThai,
    }


@router.post("/waiter/shift/checkin")
def waiter_shift_checkin(
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_waiter_or_admin),
):
    """Check-in vào ca làm việc cho nhân viên phục vụ."""
    nv = db.query(models.NhanVien).filter(models.NhanVien.id_nguoiDung == current_user.id_nguoiDung).first()
    if not nv or not nv.caLamViec:
        raise HTTPException(
            status_code=400,
            detail="Bạn chưa được Quản lý phân ca. Vui lòng liên hệ Quản lý để được phân ca."
        )

    shift_hours = {
        "Ca sáng":  {"start": 7,  "end": 12, "time_str": "07:00 - 12:00"},
        "Ca chiều": {"start": 12, "end": 17, "time_str": "12:00 - 17:00"},
        "Ca tối":   {"start": 17, "end": 24, "time_str": "17:00 - 24:00"},
    }
    assigned_shift = nv.caLamViec.strip()
    local_now = datetime.utcnow() + timedelta(hours=7)

    if assigned_shift in shift_hours:
        config = shift_hours[assigned_shift]
        if not (config["start"] <= local_now.hour < config["end"]):
            raise HTTPException(
                status_code=400,
                detail=f"Không thể vào ca! Ca của bạn là {assigned_shift} ({config['time_str']}). Hiện tại là {local_now.strftime('%H:%M')}."
            )

    nv.trangThai = "Đang làm"

    # Ghi lịch sử check-in
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
    db.refresh(nv)

    return {
        "message": "Check-in thành công",
        "caLamViec": nv.caLamViec,
        "trangThai": nv.trangThai,
    }


@router.post("/waiter/shift/checkout")
def waiter_shift_checkout(
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_waiter_or_admin),
):
    """Tan ca cho nhân viên phục vụ."""
    nv = db.query(models.NhanVien).filter(models.NhanVien.id_nguoiDung == current_user.id_nguoiDung).first()
    if not nv:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin nhân viên")

    nv.trangThai = "Nghỉ"

    # Đảm bảo bảng LICHSUCA đã được tạo
    from app.db.database import engine
    models.LichSuCa.__table__.create(bind=engine, checkfirst=True)

    local_now = datetime.utcnow() + timedelta(hours=7)
    try:
        lich_su = (
            db.query(models.LichSuCa)
            .filter(
                models.LichSuCa.id_nhanVien == nv.id_nhanVien,
                models.LichSuCa.ngay == local_now.date(),
                models.LichSuCa.thoiGianRa == None,
            )
            .order_by(models.LichSuCa.thoiGianVao.desc())
            .first()
        )
        if lich_su:
            lich_su.thoiGianRa = local_now
    except Exception as e:
        print("Lỗi ghi lịch sử ca waiter:", e)
        db.rollback()

    db.commit()
    db.refresh(nv)
    return {
        "message": "Tan ca thành công",
        "caLamViec": nv.caLamViec,
        "trangThai": nv.trangThai,
        "thoiGianRa": local_now.strftime("%H:%M %d/%m/%Y"),
    }


# ============================================================
# KITCHEN STAFF ENDPOINTS
# ============================================================

