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
            db.flush()
            id_datBan = db_reservation.id_datBan
            id_ban = db_reservation.id_ban

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
        db.rollback() 
        raise HTTPException(status_code=400, detail=f"Lỗi khi xử lý đơn hàng: {str(e)}")


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


