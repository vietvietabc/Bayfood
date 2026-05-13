from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import models, schemas
from app.api.auth import get_current_admin, get_current_user
from app.db.database import get_db

router = APIRouter(prefix="/api/donhang", tags=["Đơn Hàng"])


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
        tong_tien += gia * so_luong

        chi_tiet_list.append(
            schemas.ChiTietDonHangDetail(
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
        )

    return schemas.DonHangDetail(
        id_donHang=db_order.id_donHang,
        id_nguoiDung=db_order.id_nguoiDung,
        tenKhachHang=ten_khach,
        id_datBan=db_order.id_datBan,
        id_ban=db_order.id_ban,
        thoiGianTao=db_order.thoiGianTao,
        tinhTrang=db_order.tinhTrang,
        id_nhanVien_phucvu=db_order.id_nhanVien,
        tenNhanVienPhucVu=ten_phuc_vu,
        tongTien=tong_tien,
        chi_tiet=chi_tiet_list,
    )


@router.post("/", response_model=schemas.DonHang)
def create_order(
    order: schemas.DonHangCreateCustomer,
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_user),
):
    id_ban = order.id_ban
    if order.id_datBan is not None:
        db_reservation = (
            db.query(models.DatBan)
            .filter(
                models.DatBan.id_datBan == order.id_datBan,
                models.DatBan.id_nguoiDung == current_user.id_nguoiDung,
            )
            .first()
        )
        if not db_reservation:
            raise HTTPException(status_code=404, detail="Không tìm thấy đặt bàn của bạn")
        if id_ban is None:
            id_ban = db_reservation.id_ban
        elif db_reservation.id_ban is not None and db_reservation.id_ban != id_ban:
            raise HTTPException(status_code=400, detail="Bàn đặt không khớp với đặt bàn đã chọn")

    db_order = models.DonHang(
        id_nguoiDung=current_user.id_nguoiDung,
        id_datBan=order.id_datBan,
        id_ban=id_ban,
        tinhTrang="Đang chờ món",
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)

    for item in order.chi_tiet:
        db_order_item = models.ChiTietDonHang(
            id_donHang=db_order.id_donHang,
            id_monAn=item.id_monAn,
            soLuong=item.soLuong,
            giaTaiThoiDiemBan=item.giaTaiThoiDiemBan,
            trangThaiMon="Chờ chế biến",
        )
        db.add(db_order_item)

    db.commit()
    return db_order


@router.get("/me", response_model=list[schemas.DonHang])
def get_my_orders(db: Session = Depends(get_db), current_user: models.NguoiDung = Depends(get_current_user)):
    return (
        db.query(models.DonHang)
        .filter(models.DonHang.id_nguoiDung == current_user.id_nguoiDung)
        .order_by(models.DonHang.id_donHang.desc())
        .all()
    )


@router.get("/me/{id_donHang}", response_model=schemas.DonHangDetail)
def get_my_order_detail(
    id_donHang: int,
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_user),
):
    db_order = (
        db.query(models.DonHang)
        .filter(
            models.DonHang.id_donHang == id_donHang,
            models.DonHang.id_nguoiDung == current_user.id_nguoiDung,
        )
        .first()
    )
    if not db_order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    return _build_order_detail(db, db_order)


@router.get("/all/list", response_model=list[schemas.DonHang])
def get_all_orders(db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    return db.query(models.DonHang).order_by(models.DonHang.id_donHang.desc()).all()


@router.get("/{id_donHang}/detail", response_model=schemas.DonHangDetail)
def get_order_detail(id_donHang: int, db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    db_order = db.query(models.DonHang).filter(models.DonHang.id_donHang == id_donHang).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    return _build_order_detail(db, db_order)


@router.get("/{id_donHang}", response_model=schemas.DonHang)
def get_order(id_donHang: int, db: Session = Depends(get_db)):
    db_order = db.query(models.DonHang).filter(models.DonHang.id_donHang == id_donHang).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    return db_order


class OrderStatusUpdate(BaseModel):
    tinhTrang: str


@router.put("/{id_donHang}/status")
def update_order_status(id_donHang: int, req: OrderStatusUpdate, db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    db_order = db.query(models.DonHang).filter(models.DonHang.id_donHang == id_donHang).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    db_order.tinhTrang = req.tinhTrang
    db.commit()
    return {"message": "Cập nhật thành công"}

