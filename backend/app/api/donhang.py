from decimal import Decimal
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
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

    if order.thoiGianDen:
        from app.api.datban import validate_restaurant_hours
        validate_restaurant_hours(db, order.thoiGianDen, is_booking=False)

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

        from app.api.datban import validate_restaurant_hours
        if req.dat_ban:
            validate_restaurant_hours(db, req.dat_ban.thoiGianDen, is_booking=True)
        elif req.thoiGianDen:
            validate_restaurant_hours(db, req.thoiGianDen, is_booking=False)

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


class QROrderRequest(BaseModel):
    chi_tiet: list[schemas.ChiTietDonHangCreate]
    token: Optional[str] = None

@router.post("/table/{id_ban}/qr-order")
def create_or_append_qr_order(
    id_ban: int,
    req: QROrderRequest,
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_user),
):
    """
    Xử lý gọi món qua mã QR tại bàn.
    """
    db_ban = db.query(models.Ban).filter(models.Ban.id_ban == id_ban).first()
    if not db_ban:
        raise HTTPException(status_code=404, detail="Bàn không tồn tại")
    
    if not req.token:
        raise HTTPException(status_code=403, detail="Mã QR đã cũ hoặc không hợp lệ. Vui lòng quét mã trực tiếp tại bàn.")
        
    expected_url = f"/static/uploads/tables/qrcodes/table-{id_ban}-{req.token}.png"
    if not db_ban.maQR_url or expected_url not in db_ban.maQR_url:
        raise HTTPException(status_code=403, detail="Mã QR đã cũ hoặc không hợp lệ. Vui lòng quét lại mã QR mới tại bàn.")

    active_order = db.query(models.DonHang).filter(
        models.DonHang.id_ban == id_ban,
        models.DonHang.tinhTrang.in_(["Đang chờ món", "Đang phục vụ", "Chờ khách đến"])
    ).first()

    tong_tien_them = Decimal("0")
    auto_checked_in = False

    if active_order:
        if active_order.id_nguoiDung != current_user.id_nguoiDung:
            raise HTTPException(status_code=400, detail="Bàn này đang được sử dụng bởi một khách hàng khác. Vui lòng sử dụng điện thoại của người đã đặt để gọi thêm món, hoặc nhờ nhân viên hỗ trợ.")
        
        if active_order.tinhTrang == "Chờ khách đến":
            from app.api.datban import _now_utc_naive
            from datetime import timedelta
            if _now_utc_naive() < (active_order.thoiGianDen - timedelta(minutes=15)):
                raise HTTPException(status_code=400, detail="Chưa đến thời gian nhận bàn (sớm nhất trước 15 phút). Vui lòng đợi thêm hoặc liên hệ nhân viên để check-in sớm.")
            
            # Tự động checkin
            active_order.tinhTrang = "Đang chờ món"
            if active_order.id_datBan:
                db_datban = db.query(models.DatBan).filter(models.DatBan.id_datBan == active_order.id_datBan).first()
                if db_datban:
                    db_datban.trangThai = "Đã checkin"
            
            db_ban = db.query(models.Ban).filter(models.Ban.id_ban == id_ban).first()
            if db_ban:
                db_ban.trangThai = "Đang phục vụ"
            
            auto_checked_in = True

        for item in req.chi_tiet:
            db_order_item = models.ChiTietDonHang(
                id_donHang=active_order.id_donHang,
                id_monAn=item.id_monAn,
                soLuong=item.soLuong,
                giaTaiThoiDiemBan=item.giaTaiThoiDiemBan,
                trangThaiMon="Chờ chế biến",
            )
            db.add(db_order_item)
            tong_tien_them += item.giaTaiThoiDiemBan * item.soLuong
        
        db.commit()
        return {
            "status": "appended", 
            "id_donHang": active_order.id_donHang, 
            "message": "Đã tự động check-in và gọi thêm món thành công." if auto_checked_in else "Đã thêm món vào đơn hàng hiện tại"
        }
    else:
        # Kiểm tra xem bàn có đang được đặt trước (DatBan) nhưng chưa check-in không
        pending_reservation = db.query(models.DatBan).filter(
            models.DatBan.id_ban == id_ban,
            models.DatBan.trangThai.in_(["Chờ xác nhận", "Đã xác nhận"])
        ).first()

        if pending_reservation:
            if pending_reservation.id_nguoiDung == current_user.id_nguoiDung:
                if pending_reservation.trangThai == "Chờ xác nhận":
                    raise HTTPException(status_code=400, detail="Lịch đặt bàn của bạn chưa được nhà hàng xác nhận.")
                
                from app.api.datban import _now_utc_naive
                from datetime import timedelta
                if _now_utc_naive() < (pending_reservation.thoiGianDen - timedelta(minutes=15)):
                    raise HTTPException(status_code=400, detail="Chưa đến thời gian nhận bàn (sớm nhất trước 15 phút). Vui lòng đợi thêm hoặc liên hệ nhân viên để check-in sớm.")
                
                # Tự động check-in
                pending_reservation.trangThai = "Đã checkin"
                
                # Tạo đơn hàng mới liên kết với datban này
                db_order = models.DonHang(
                    id_nguoiDung=current_user.id_nguoiDung,
                    id_ban=id_ban,
                    id_datBan=pending_reservation.id_datBan,
                    tinhTrang="Đang chờ món",
                    thoiGianDen=pending_reservation.thoiGianDen,
                )
                db.add(db_order)
                db.flush()

                # Cập nhật bàn
                db_ban = db.query(models.Ban).filter(models.Ban.id_ban == id_ban).first()
                if db_ban:
                    db_ban.trangThai = "Đang phục vụ"
                
                auto_checked_in = True

            else:
                raise HTTPException(status_code=400, detail="Bàn này đã được đặt trước bởi người khác. Vui lòng chọn bàn khác hoặc nhờ nhân viên hỗ trợ.")
        else:
            db_order = models.DonHang(
                id_nguoiDung=current_user.id_nguoiDung,
                id_ban=id_ban,
                tinhTrang="Đang chờ món",
            )
            db.add(db_order)
            db.flush()

            # Khi khách đến tận nơi quét QR tạo đơn mới, cập nhật trạng thái bàn thành Đang phục vụ luôn
            db_ban = db.query(models.Ban).filter(models.Ban.id_ban == id_ban).first()
            if db_ban:
                db_ban.trangThai = "Đang phục vụ"


        for item in req.chi_tiet:
            db_order_item = models.ChiTietDonHang(
                id_donHang=db_order.id_donHang,
                id_monAn=item.id_monAn,
                soLuong=item.soLuong,
                giaTaiThoiDiemBan=item.giaTaiThoiDiemBan,
                trangThaiMon="Chờ chế biến",
            )
            db.add(db_order_item)
            tong_tien_them += item.giaTaiThoiDiemBan * item.soLuong

        # Khi khách đến tận nơi quét QR tạo đơn mới, cập nhật trạng thái bàn thành Đang phục vụ luôn
        db_ban = db.query(models.Ban).filter(models.Ban.id_ban == id_ban).first()
        if db_ban:
            db_ban.trangThai = "Đang phục vụ"

        db.commit()
        return {"status": "created", "id_donHang": db_order.id_donHang, "message": "Đã tạo đơn hàng mới tại bàn"}


@router.get("/me", response_model=list[schemas.DonHangDetail])
def get_my_orders(db: Session = Depends(get_db), current_user: models.NguoiDung = Depends(get_current_user)):
    # Tự động xử lý đơn hàng (+ đặt bàn) quá hạn trước khi trả kết quả
    from app.api.auto_noshow import auto_mark_no_show
    auto_mark_no_show(db)

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

    if db_order.tinhTrang != "Chờ khách đến":
        raise HTTPException(status_code=400, detail="Đơn hàng đã check-in hoặc đang được phục vụ, không thể chỉnh sửa")

    if not req.chi_tiet:
        raise HTTPException(status_code=400, detail="Đơn hàng phải có ít nhất 1 món")

    if req.thoiGianDen:
        from app.api.datban import validate_restaurant_hours
        validate_restaurant_hours(db, req.thoiGianDen, is_booking=False)

    if req.thoiGianDen:
        db_order.thoiGianDen = req.thoiGianDen
        if db_order.tinhTrang == "Đang chờ món":
            db_order.tinhTrang = "Chờ khách đến"

    # Đánh dấu các món cũ là "Dã hủy" để lưu lịch sử (không xóa)
    db.query(models.ChiTietDonHang).filter(
        models.ChiTietDonHang.id_donHang == db_order.id_donHang,
        models.ChiTietDonHang.trangThaiMon != "Đã hủy"
    ).update({"trangThaiMon": "Đã hủy"})

    # Thêm các món mới
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


class DonHangEditInitiateRequest(BaseModel):
    """Body cho endpoint initiate-edit: danh sách món mới."""
    chi_tiet: list


@router.post("/me/{id_donHang}/initiate-edit")
def initiate_order_edit(
    id_donHang: int,
    req: DonHangEditInitiateRequest,
    http_req: Request,
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_user),
):
    """
    Bước 1 của chỉnh sửa đơn hàng đã cọc.
    - Nếu tổng mới <= tổng cũ HOẶC đơn không có cọc → áp dụng ngay, trả {"status": "updated"}.
    - Nếu tổng mới > tổng cũ VÀ đơn đã cọc → tạo ChinhSuaDonHangChoThanhToan + trả VNPay URL cho chênh lệch.
    """
    from fastapi import Request as FastRequest
    import json
    from decimal import Decimal

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
        raise HTTPException(status_code=400, detail="Đơn hàng đã check-in hoặc đang được phục vụ, không thể chỉnh sửa")

    if not req.chi_tiet:
        raise HTTPException(status_code=400, detail="Đơn hàng phải có ít nhất 1 món")

    # Tính tổng đơn CŨ (chỉ tính các món đang active, bỏ qua món "Đã hủy" từ lịch sử)
    old_items = db.query(models.ChiTietDonHang).filter(
        models.ChiTietDonHang.id_donHang == db_order.id_donHang,
        models.ChiTietDonHang.trangThaiMon != "Đã hủy"
    ).all()
    old_total = sum(
        (ct.giaTaiThoiDiemBan or Decimal("0")) * (ct.soLuong or 0)
        for ct in old_items
    )

    # Tính tổng đơn MỚI
    new_total = sum(
        Decimal(str(item["giaTaiThoiDiemBan"])) * int(item["soLuong"])
        for item in req.chi_tiet
    )
    from app.api.payment import MIN_ORDER_FOR_TABLE, TABLE_DEPOSIT_FEE

    # Kiem tra xem don co coc khong va lay thong tin datBan
    has_deposit = False
    original_payment_mode = "toàn bộ"
    reservation = None
    if db_order.id_datBan:
        reservation = db.query(models.DatBan).filter(
            models.DatBan.id_datBan == db_order.id_datBan
        ).first()
        if reservation and reservation.trangThaiCoc in ["Da coc", "Đã cọc"]:
            has_deposit = True

    # Lấy phí bàn (nếu có đặt bàn)
    table_fee = TABLE_DEPOSIT_FEE
    if reservation and reservation.id_ban:
        db_ban = db.query(models.Ban).filter(models.Ban.id_ban == reservation.id_ban).first()
        if db_ban and db_ban.tienCocMacDinh and float(db_ban.tienCocMacDinh) > 0:
            table_fee = int(db_ban.tienCocMacDinh)

    # Tính số tiền đã trả thực tế để phát hiện trả dư
    payments = db.query(models.ThanhToan).filter(
        models.ThanhToan.id_donHang == db_order.id_donHang
    ).all()
    tong_thanh_toan = float(sum(p.soTienThanhToan for p in payments)) if payments else 0.0
    tien_coc = float(reservation.tienCoc) if (has_deposit and reservation and reservation.tienCoc) else 0.0
    total_paid = max(tien_coc, tong_thanh_toan)

    # Xac dinh payment_mode goc: neu tienCoc < 50% tong don cu → đặt cọc (10%)
    if has_deposit and reservation and reservation.tienCoc is not None:
        if float(reservation.tienCoc) < float(old_total) * 0.5:
            original_payment_mode = "đặt cọc"   # da coc 10% + phi ban
        else:
            original_payment_mode = "toàn bộ"      # da tra full 100%

    # Tính số tiền CẦN trả theo tổng mới
    so_tien_them = 0
    if has_deposit:
        if original_payment_mode == "đặt cọc":
            required_paid = table_fee + float(new_total) * 0.1
        else:
            required_paid = float(new_total)
        
        so_tien_them = int(max(0.0, required_paid - total_paid))

    so_du = max(0.0, total_paid - float(new_total))

    # Neu khong can tra them tien → ap dung ngay
    if not has_deposit or so_tien_them <= 0:
        # Chặn chỉnh sửa xuống dưới ngưỡng tối thiểu khi có đặt bàn
        if db_order.id_datBan and float(new_total) < MIN_ORDER_FOR_TABLE:
            raise HTTPException(
                status_code=400,
                detail=f"Đơn hàng kèm đặt bàn cần tối thiểu {MIN_ORDER_FOR_TABLE:,} VNĐ. Không thể chỉnh sửa xuống dưới mức này.".replace(",", ".")
            )

        # Đánh dấu món cũ là "Đã hủy" để lưu lịch sử
        db.query(models.ChiTietDonHang).filter(
            models.ChiTietDonHang.id_donHang == db_order.id_donHang,
            models.ChiTietDonHang.trangThaiMon != "Đã hủy"
        ).update({"trangThaiMon": "Đã hủy"})
        for item in req.chi_tiet:
            db.add(models.ChiTietDonHang(
                id_donHang=db_order.id_donHang,
                id_monAn=item["id_monAn"],
                soLuong=item["soLuong"],
                giaTaiThoiDiemBan=Decimal(str(item["giaTaiThoiDiemBan"])),
                trangThaiMon="Chờ chế biến",
            ))
        db.commit()

        return {
            "status": "updated",
            "id_donHang": db_order.id_donHang,
            "old_total": float(old_total),
            "new_total": float(new_total),
            "total_paid": total_paid,
            "so_du": so_du,   # > 0 nếu khách đã trả dư, nhà hàng cần hoàn khi khách đến
        }

    db.query(models.ChinhSuaDonHangChoThanhToan).filter(
        models.ChinhSuaDonHangChoThanhToan.id_donHang == db_order.id_donHang,
        models.ChinhSuaDonHangChoThanhToan.id_nguoiDung == current_user.id_nguoiDung,
        models.ChinhSuaDonHangChoThanhToan.trangThai == "Đang chờ"
    ).update({"trangThai": "Đã hủy"})

    new_cart_json = json.dumps(req.chi_tiet, ensure_ascii=False)
    pending_edit = models.ChinhSuaDonHangChoThanhToan(
        id_nguoiDung=current_user.id_nguoiDung,
        id_donHang=db_order.id_donHang,
        gioHangMoi_json=new_cart_json,
        tongTienCu=old_total,
        tongTienMoi=new_total,
        soTienThem=so_tien_them,
        hinhThucThanhToan=original_payment_mode,
    )
    db.add(pending_edit)
    db.commit()
    db.refresh(pending_edit)

    # Tao VNPay URL cho khoan chenh lech
    from app.api.payment import _build_vnpay_url
    from datetime import datetime as _dt
    txn_ref = f"OE{pending_edit.id}_{int(_dt.now().timestamp())}"
    ip_addr = http_req.client.host if http_req.client else "127.0.0.1"
    order_info = f"BayFood bo sung don hang #{id_donHang} {so_tien_them}VND"
    payment_url = _build_vnpay_url(so_tien_them, txn_ref, order_info, ip_addr)

    pending_edit.maGiaoDich = txn_ref
    db.commit()

    return {
        "status": "payment_required",
        "paymentUrl": payment_url,
        "pendingEditId": pending_edit.id,
        "txnRef": txn_ref,
        "hinhThucThanhToan": original_payment_mode,
        "old_total": float(old_total),
        "new_total": float(new_total),
        "diff": float(new_total - old_total),
        "so_tien_them": so_tien_them,
    }


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

    # Cập nhật trạng thái bàn thành "Đang phục vụ" khi khách check-in
    if db_order.id_ban is not None:
        db_ban = db.query(models.Ban).filter(models.Ban.id_ban == db_order.id_ban).first()
        if db_ban and db_ban.trangThai != "Có khách":
            db_ban.trangThai = "Có khách"

    db.commit()
    return _build_order_detail(db, db_order)


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

