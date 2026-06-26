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

@router.get("/all/list", response_model=list[schemas.DonHang])
def get_all_orders(db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    # Tự động xử lý đơn hàng (+ đặt bàn) quá hạn trước khi trả kết quả
    from app.api.auto_noshow import auto_mark_no_show
    from sqlalchemy import func
    auto_mark_no_show(db)

    orders = db.query(models.DonHang).order_by(models.DonHang.id_donHang.desc()).all()

    result = []
    for order in orders:
        # Tính tongTien từ chi tiết đơn hàng
        tong_tien = db.query(
            func.sum(models.ChiTietDonHang.giaTaiThoiDiemBan * models.ChiTietDonHang.soLuong)
        ).filter(models.ChiTietDonHang.id_donHang == order.id_donHang).scalar() or Decimal("0")

        # Lấy tên khách hàng
        khach = db.query(models.NguoiDung).filter(
            models.NguoiDung.id_nguoiDung == order.id_nguoiDung
        ).first()

        # Lấy tên bàn
        ban = db.query(models.Ban).filter(
            models.Ban.id_ban == order.id_ban
        ).first() if order.id_ban else None

        # Tạo dict response (không dùng from_orm vì schema có extra fields)
        result.append({
            "id_donHang": order.id_donHang,
            "id_nguoiDung": order.id_nguoiDung,
            "id_datBan": order.id_datBan,
            "id_nhanVien": order.id_nhanVien,
            "id_ban": order.id_ban,
            "thoiGianTao": order.thoiGianTao,
            "thoiGianDen": order.thoiGianDen,
            "tinhTrang": order.tinhTrang,
            "tongTien": float(tong_tien),
            "tenKhachHang": khach.hoTen if khach else None,
            "tenBan": ban.tenBan if ban else None,
        })

    return result


@router.get("/{id_donHang}/detail", response_model=schemas.DonHangDetail)
def get_order_detail(id_donHang: int, db: Session = Depends(get_db), current_user: models.NguoiDung = Depends(get_current_waiter_or_admin)):
    db_order = db.query(models.DonHang).filter(models.DonHang.id_donHang == id_donHang).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    return _build_order_detail(db, db_order)


@router.get("/{id_donHang}", response_model=schemas.DonHang)
def get_order(id_donHang: int, db: Session = Depends(get_db)):
    db_order = db.query(models.DonHang).filter(models.DonHang.id_donHang == id_donHang).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    return db_order



@router.put("/{id_donHang}/status")
def update_order_status(
    id_donHang: int,
    req: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_waiter_or_admin)
):
    # Kiểm tra ca làm việc đối với nhân viên phục vụ
    vai_tro = db.query(models.VaiTro).filter(models.VaiTro.id_vaiTro == current_user.id_vaiTro).first()
    ten_vai_tro = (vai_tro.tenVaiTro if vai_tro else "").strip().lower()
    if ten_vai_tro == "nhân viên phục vụ":
        nv = db.query(models.NhanVien).filter(models.NhanVien.id_nguoiDung == current_user.id_nguoiDung).first()
        if not nv or nv.trangThai != "Đang làm":
            raise HTTPException(
                status_code=400,
                detail="Bạn chưa vào ca làm việc! Vui lòng vào ca trước khi thực hiện nhận/phục vụ đơn hàng."
            )

    db_order = db.query(models.DonHang).filter(models.DonHang.id_donHang == id_donHang).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

    db_order.tinhTrang = req.tinhTrang

    if req.tinhTrang in ["Đã phục vụ", "Đã thanh toán"]:
        db_order.thoiGianHoanThanh = models.get_vn_time()

    # Ghi nhận nhân viên phục vụ / quản lý chịu trách nhiệm cho đơn hàng này
    nv = db.query(models.NhanVien).filter(models.NhanVien.id_nguoiDung == current_user.id_nguoiDung).first()
    if nv:
        db_order.id_nhanVien = nv.id_nhanVien

    # Cập nhật trạng thái bàn khi đơn chuyển sang trạng thái đang phục vụ
    if req.tinhTrang in ["Đang chờ món", "Đang chế biến"] and db_order.id_ban is not None:
        db_ban = db.query(models.Ban).filter(models.Ban.id_ban == db_order.id_ban).first()
        if db_ban and db_ban.trangThai not in ["Có khách"]:
            db_ban.trangThai = "Có khách"

    if req.tinhTrang in ["Đã thanh toán", "Hoàn thành"]:
        # Reset bàn về Trống khi đơn hoàn thành
        if db_order.id_ban is not None:
            db_ban = db.query(models.Ban).filter(models.Ban.id_ban == db_order.id_ban).first()
            if db_ban:
                db_ban.trangThai = "Trống"

        if db_order.id_datBan is not None:
            db_res = db.query(models.DatBan).filter(models.DatBan.id_datBan == db_order.id_datBan).first()
            if db_res and db_res.trangThai == "Đã checkin":
                db_res.trangThai = "Hoàn thành"

    if req.tinhTrang == "Đã thanh toán":
        from decimal import Decimal
        # Tính toán số tiền còn thiếu và thêm vào bảng THANHTOAN
        chi_tiets = db.query(models.ChiTietDonHang).filter(
            models.ChiTietDonHang.id_donHang == db_order.id_donHang,
            models.ChiTietDonHang.trangThaiMon != "Đã hủy"  # Chỉ tính món active
        ).all()
        tong_tien = sum((Decimal(str(ct.giaTaiThoiDiemBan or 0))) * (ct.soLuong or 0) for ct in chi_tiets)

        tien_coc = Decimal("0")
        if db_order.id_datBan:
            db_res = db.query(models.DatBan).filter(models.DatBan.id_datBan == db_order.id_datBan).first()
            if db_res and db_res.trangThaiCoc == "Đã cọc":
                tien_coc = Decimal(str(db_res.tienCoc or 0))

        payments = db.query(models.ThanhToan).filter(models.ThanhToan.id_donHang == db_order.id_donHang).all()
        tong_thanh_toan = sum(Decimal(str(p.soTienThanhToan or 0)) for p in payments) if payments else Decimal("0")

        effective_paid = max(tien_coc, tong_thanh_toan)
        remaining = max(Decimal("0"), tong_tien - effective_paid)

        if remaining > 0:
            new_payment = models.ThanhToan(
                id_donHang=db_order.id_donHang,
                phuongThuc="Tiền mặt",
                soTienThanhToan=remaining,
                thoiGianGiaoDich=models.get_vn_time()
            )
            db.add(new_payment)

    db.commit()
    return {"message": "Cập nhật thành công"}


# ============================================================
# WAITER STAFF ENDPOINTS
# ============================================================

