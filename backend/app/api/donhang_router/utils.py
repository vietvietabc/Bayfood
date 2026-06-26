from decimal import Decimal
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app import models, schemas
from app.api.auth import get_current_admin, get_current_user
from app.db.database import get_db



def get_current_kitchen_or_admin(
    current_user: models.NguoiDung = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cho phép nhân viên bếp hoặc quản lý truy cập."""
    vai_tro = db.query(models.VaiTro).filter(models.VaiTro.id_vaiTro == current_user.id_vaiTro).first()
    ten_vai_tro = (vai_tro.tenVaiTro if vai_tro else "").strip().lower()
    allowed = {"quản lý", "Nhân viên nhà bếp"}
    if ten_vai_tro not in allowed and current_user.id_vaiTro not in (2, 3):
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập trang này")
    return current_user


def get_current_waiter_or_admin(
    current_user: models.NguoiDung = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cho phép nhân viên phục vụ hoặc quản lý truy cập."""
    vai_tro = db.query(models.VaiTro).filter(models.VaiTro.id_vaiTro == current_user.id_vaiTro).first()
    ten_vai_tro = (vai_tro.tenVaiTro if vai_tro else "").strip().lower()
    allowed = {"quản lý", "nhân viên phục vụ"}
    if ten_vai_tro not in allowed and current_user.id_vaiTro not in (2, 4):
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập chức năng này")
    return current_user


def _build_order_detail(db: Session, db_order: models.DonHang) -> schemas.DonHangDetail:
    khach_hang = db.query(models.NguoiDung).filter(models.NguoiDung.id_nguoiDung == db_order.id_nguoiDung).first()
    ten_khach = khach_hang.hoTen if khach_hang else None

    ten_phuc_vu = None
    if db_order.id_nhanVien:
        nv_phuc_vu = db.query(models.NhanVien).filter(models.NhanVien.id_nhanVien == db_order.id_nhanVien).first()
        if nv_phuc_vu:
            nd_phuc_vu = db.query(models.NguoiDung).filter(models.NguoiDung.id_nguoiDung == nv_phuc_vu.id_nguoiDung).first()
            ten_phuc_vu = nd_phuc_vu.hoTen if nd_phuc_vu else None

    chi_tiets = db.query(models.ChiTietDonHang).filter(models.ChiTietDonHang.id_donHang == db_order.id_donHang).all()
    tong_tien = Decimal("0")
    chi_tiet_list = []
    lich_su_list = []

    for ct in chi_tiets:
        mon_an = db.query(models.ThucDon).filter(models.ThucDon.id_monAn == ct.id_monAn).first()
        ten_mon = mon_an.tenMon if mon_an else None
        hinh_anh_mon = mon_an.hinhAnh if mon_an else None

        ten_nv_bep = None
        if ct.id_nhanVien:
            nv_bep = db.query(models.NhanVien).filter(models.NhanVien.id_nhanVien == ct.id_nhanVien).first()
            if nv_bep:
                nd_bep = db.query(models.NguoiDung).filter(models.NguoiDung.id_nguoiDung == nv_bep.id_nguoiDung).first()
                ten_nv_bep = nd_bep.hoTen if nd_bep else None

        so_luong = ct.soLuong or 0
        gia = ct.giaTaiThoiDiemBan or Decimal("0")

        item = schemas.ChiTietDonHangDetail(
            id_chiTietDonHang=ct.id_chiTietDonHang,
            id_donHang=ct.id_donHang,
            id_monAn=ct.id_monAn,
            tenMon=ten_mon,
            hinhAnhMon=hinh_anh_mon,
            soLuong=so_luong,
            giaTaiThoiDiemBan=gia,
            trangThaiMon=ct.trangThaiMon or "",
            id_nhanVien_bep=ct.id_nhanVien,
            tenNhanVienBep=ten_nv_bep,
        )

        if ct.trangThaiMon == "Đã hủy":
            # Món đã bị hủy trong lịch sử chỉnh sửa → vào lịch sử
            lich_su_list.append(item)
        else:
            tong_tien += gia * so_luong
            chi_tiet_list.append(item)

    tien_coc = None
    trang_thai_coc = None
    if db_order.id_datBan:
        db_reservation = db.query(models.DatBan).filter(models.DatBan.id_datBan == db_order.id_datBan).first()
        if db_reservation:
            tien_coc = db_reservation.tienCoc
            trang_thai_coc = db_reservation.trangThaiCoc

    # Tính tổng số tiền đã thanh toán từ bảng THANHTOAN
    payments = db.query(models.ThanhToan).filter(models.ThanhToan.id_donHang == db_order.id_donHang).all()
    tong_thanh_toan = sum(p.soTienThanhToan for p in payments) if payments else Decimal("0")

    return schemas.DonHangDetail(
        id_donHang=db_order.id_donHang,
        id_nguoiDung=db_order.id_nguoiDung,
        tenKhachHang=ten_khach,
        id_datBan=db_order.id_datBan,
        id_ban=db_order.id_ban,
        thoiGianTao=db_order.thoiGianTao,
        thoiGianDen=db_order.thoiGianDen,
        tinhTrang=db_order.tinhTrang,
        id_nhanVien_phucvu=db_order.id_nhanVien,
        tenNhanVienPhucVu=ten_phuc_vu,
        tongTien=tong_tien,
        tienCoc=tien_coc,
        trangThaiCoc=trang_thai_coc,
        tongThanhToan=tong_thanh_toan,
        chi_tiet=chi_tiet_list,
        lich_su_chi_tiet=lich_su_list,
    )




class QROrderRequest(BaseModel):
    chi_tiet: list[schemas.ChiTietDonHangCreate]
    token: Optional[str] = None

class DonHangEditInitiateRequest(BaseModel):
    """Body cho endpoint initiate-edit: danh sách món mới."""
    chi_tiet: list


class OrderStatusUpdate(BaseModel):
    tinhTrang: str


class ItemStatusUpdate(BaseModel):
    trangThaiMon: str


class ShiftCheckInRequest(BaseModel):
    caLamViec: str


class ShiftCheckOutRequest(BaseModel):
    lyDoTanCaSom: Optional[str] = None


