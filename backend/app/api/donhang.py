from decimal import Decimal
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app import models, schemas
from app.api.auth import get_current_admin, get_current_user
from app.db.database import get_db

router = APIRouter(prefix="/api/donhang", tags=["Đơn Hàng"])


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

    tien_coc = None
    trang_thai_coc = None
    if db_order.id_datBan:
        db_reservation = db.query(models.DatBan).filter(models.DatBan.id_datBan == db_order.id_datBan).first()
        if db_reservation:
            tien_coc = db_reservation.tienCoc
            trang_thai_coc = db_reservation.trangThaiCoc

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
        thoiGianDen=order.thoiGianDen,
        tinhTrang="Chờ khách đến" if order.thoiGianDen else "Đang chờ món",
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


@router.post("/create-with-booking")
def create_order_with_booking(
    req: schemas.OrderWithOptionalBookingCreate,
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_user),
):
    try:
        id_datBan = req.id_datBan
        id_ban = req.id_ban

        if req.dat_ban:
            # Tạo Đặt Bàn (Step 1)
            db_reservation = models.DatBan(
                id_ban=req.dat_ban.id_ban,
                id_nguoiDung=current_user.id_nguoiDung,
                thoiGianDen=req.dat_ban.thoiGianDen,
                soNguoi=req.dat_ban.soNguoi,
                ghiChu=req.dat_ban.ghiChu or "Đặt bàn kèm đơn hàng trước",
                trangThai="Chờ xác nhận",
            )
            db.add(db_reservation)
            db.flush() # Flush để lấy id_datBan mà vẫn giữ Transaction
            id_datBan = db_reservation.id_datBan
            id_ban = db_reservation.id_ban

        # Tạo Đơn Hàng (Step 2)
        thoi_gian_den = req.thoiGianDen
        if req.dat_ban:
            thoi_gian_den = req.dat_ban.thoiGianDen

        db_order = models.DonHang(
            id_nguoiDung=current_user.id_nguoiDung,
            id_datBan=id_datBan,
            id_ban=id_ban,
            thoiGianDen=thoi_gian_den,
            tinhTrang="Chờ khách đến" if thoi_gian_den else "Đang chờ món",
        )
        db.add(db_order)
        db.flush()

        # Tạo Chi Tiết Đơn Hàng (Step 3)
        tong_tien = Decimal("0")
        for item in req.chi_tiet:
            db_order_item = models.ChiTietDonHang(
                id_donHang=db_order.id_donHang,
                id_monAn=item.id_monAn,
                soLuong=item.soLuong,
                giaTaiThoiDiemBan=item.giaTaiThoiDiemBan,
                trangThaiMon="Chờ chế biến",
            )
            db.add(db_order_item)
            tong_tien += item.giaTaiThoiDiemBan * item.soLuong

        db.commit()
        db.refresh(db_order)

        has_reservation = (db_order.id_datBan is not None) or (db_order.thoiGianDen is not None)
        return {
            "id_donHang": db_order.id_donHang,
            "id_nguoiDung": db_order.id_nguoiDung,
            "id_datBan": db_order.id_datBan,
            "id_nhanVien": db_order.id_nhanVien,
            "id_ban": db_order.id_ban,
            "thoiGianTao": str(db_order.thoiGianTao),
            "thoiGianDen": str(db_order.thoiGianDen) if db_order.thoiGianDen else None,
            "tinhTrang": db_order.tinhTrang,
            "tongTien": float(tong_tien),
            "hasReservation": has_reservation,
        }
    except Exception as e:
        db.rollback() # Rollback toàn bộ nếu có lỗi ở bất kỳ bước nào
        raise HTTPException(status_code=400, detail=f"Lỗi khi xử lý đơn hàng: {str(e)}")


@router.get("/me", response_model=list[schemas.DonHangDetail])
def get_my_orders(db: Session = Depends(get_db), current_user: models.NguoiDung = Depends(get_current_user)):
    orders = (
        db.query(models.DonHang)
        .filter(models.DonHang.id_nguoiDung == current_user.id_nguoiDung)
        .order_by(models.DonHang.id_donHang.desc())
        .all()
    )
    return [_build_order_detail(db, o) for o in orders]


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


@router.put("/me/{id_donHang}", response_model=schemas.DonHangDetail)
def edit_my_order(
    id_donHang: int,
    req: schemas.DonHangEditCustomer,
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

    if db_order.tinhTrang not in ["Đang chờ món", "Chờ khách đến"]:
        raise HTTPException(status_code=400, detail="Đơn hàng đã được tiếp nhận, không thể chỉnh sửa")

    if not req.chi_tiet:
        raise HTTPException(status_code=400, detail="Đơn hàng phải có ít nhất 1 món")

    if req.thoiGianDen:
        db_order.thoiGianDen = req.thoiGianDen
        if db_order.tinhTrang == "Đang chờ món":
            db_order.tinhTrang = "Chờ khách đến"

    # Xóa chi tiết cũ
    db.query(models.ChiTietDonHang).filter(models.ChiTietDonHang.id_donHang == db_order.id_donHang).delete()

    # Thêm chi tiết mới
    for item in req.chi_tiet:
        db_order_item = models.ChiTietDonHang(
            id_donHang=db_order.id_donHang,
            id_monAn=item.id_monAn,
            soLuong=item.soLuong,
            giaTaiThoiDiemBan=item.giaTaiThoiDiemBan,
            trangThaiMon="Chờ chế biến",
        )
        db.add(db_order_item)

    db.commit()
    return _build_order_detail(db, db_order)


@router.put("/me/{id_donHang}/checkin", response_model=schemas.DonHangDetail)
def checkin_my_order(
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

    if db_order.tinhTrang != "Chờ khách đến":
        raise HTTPException(status_code=400, detail="Đơn hàng không ở trạng thái chờ khách đến")

    if db_order.thoiGianDen:
        from app.api.datban import _now_utc_naive
        if _now_utc_naive() < (db_order.thoiGianDen - timedelta(minutes=15)):
            raise HTTPException(status_code=400, detail="Chưa đến thời gian báo tới cho đơn hàng này")

    db_order.tinhTrang = "Đang chờ món"
    db.commit()
    return _build_order_detail(db, db_order)


@router.get("/all/list", response_model=list[schemas.DonHang])
def get_all_orders(db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    return db.query(models.DonHang).order_by(models.DonHang.id_donHang.desc()).all()


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
        raise HTTPException(status_code=404, detail="Order not found")
    return db_order


class OrderStatusUpdate(BaseModel):
    tinhTrang: str


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
        raise HTTPException(status_code=404, detail="Order not found")

    db_order.tinhTrang = req.tinhTrang

    if req.tinhTrang in ["Đã phục vụ", "Đã thanh toán"]:
        db_order.thoiGianHoanThanh = models.get_vn_time()

    # Ghi nhận nhân viên phục vụ / quản lý chịu trách nhiệm cho đơn hàng này
    nv = db.query(models.NhanVien).filter(models.NhanVien.id_nguoiDung == current_user.id_nguoiDung).first()
    if nv:
        db_order.id_nhanVien = nv.id_nhanVien

    if req.tinhTrang == "Đã thanh toán":
        if db_order.id_ban is not None:
            db_ban = db.query(models.Ban).filter(models.Ban.id_ban == db_order.id_ban).first()
            if db_ban:
                db_ban.trangThai = "Trống"

        if db_order.id_datBan is not None:
            db_res = db.query(models.DatBan).filter(models.DatBan.id_datBan == db_order.id_datBan).first()
            if db_res and db_res.trangThai == "Đã checkin":
                db_res.trangThai = "Hoàn thành"

    db.commit()
    return {"message": "Cập nhật thành công"}


# ============================================================
# WAITER STAFF ENDPOINTS
# ============================================================

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
            models.ChiTietDonHang.id_donHang == order.id_donHang
        ).all()
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
            })

        khach = db.query(models.NguoiDung).filter(
            models.NguoiDung.id_nguoiDung == order.id_nguoiDung
        ).first()

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

    query = db.query(models.DonHang).filter(models.DonHang.tinhTrang.in_(["Đã thanh toán", "Đã phục vụ"]))

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
            models.ChiTietDonHang.id_donHang == order.id_donHang
        ).all()
        items = []
        for ct in chi_tiets:
            mon = db.query(models.ThucDon).filter(models.ThucDon.id_monAn == ct.id_monAn).first()
            items.append({
                "tenMon": mon.tenMon if mon else f"Món #{ct.id_monAn}",
                "soLuong": ct.soLuong,
                "trangThaiMon": ct.trangThaiMon,
            })
        khach = db.query(models.NguoiDung).filter(
            models.NguoiDung.id_nguoiDung == order.id_nguoiDung
        ).first()
        result.append({
            "id_donHang": order.id_donHang,
            "id_ban": order.id_ban,
            "tenKhachHang": khach.hoTen if khach else None,
            "thoiGianTao": order.thoiGianTao,
            "thoiGianHoanThanh": order.thoiGianHoanThanh,
            "tinhTrang": order.tinhTrang,
            "isMyOrder": is_mine,
            "soMon": len(items),
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
        "Ca tối":   {"start": 17, "end": 22, "time_str": "17:00 - 22:00"},
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
            .filter(models.ChiTietDonHang.id_donHang == order.id_donHang)
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


class ItemStatusUpdate(BaseModel):
    trangThaiMon: str


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


class ShiftCheckInRequest(BaseModel):
    caLamViec: str


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
        "Ca tối": {"start": 17, "end": 22, "time_str": "17:00 - 22:00"},
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
    
    


class ShiftCheckOutRequest(BaseModel):
    lyDoTanCaSom: Optional[str] = None


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

