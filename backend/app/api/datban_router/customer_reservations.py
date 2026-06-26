from app.api.datban_router.utils import _calculate_remaining_hold_minutes
from datetime import datetime, timedelta, timezone, date, time
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app import models
from app import schemas
from app.api.auth import get_current_admin, get_current_user
from app.api.thongbao import create_notification

logger = logging.getLogger(__name__)


router = APIRouter()

from .utils import *
from .utils import _normalize_datetime, _business_day_window, _clock_to_datetime, _round_datetime_to_hour, _find_conflicting_reservation, _calculate_remaining_hold_minutes, _get_table_schedule, _now_utc_naive, _classify_table_time, _is_checkin_allowed, _get_conflicting_reservation, _build_table_timeline, _get_active_reservations_for_table, _get_all_reservations_for_table_on_date, _clock_to_minutes, _minutes_to_time, _has_time_overlap, _reservation_window, validate_restaurant_hours, SERVICE_DURATION, TIMELINE_SLOT_MINUTES


@router.post("/", response_model=schemas.DatBan)
def create_reservation(reservation: schemas.DatBanCreateCustomer, db: Session = Depends(get_db), current_user: models.NguoiDung = Depends(get_current_user)):
    logger.info("User %s yêu cầu đặt bàn lúc %s, số người: %s, bàn chỉ định: %s", 
                current_user.id_nguoiDung, reservation.thoiGianDen, reservation.soNguoi, reservation.id_ban)
    
    if reservation.soNguoi <= 0:
        logger.warning("Đặt bàn thất bại: Số người không hợp lệ (%s)", reservation.soNguoi)
        raise HTTPException(status_code=400, detail="Số lượng người đặt phải lớn hơn 0")

    reservation_time = _normalize_datetime(reservation.thoiGianDen)
    validate_restaurant_hours(db, reservation_time, is_booking=True)

    # Nếu đặt muộn (sau 21h), thời gian dùng bữa sẽ bị giới hạn bởi giờ đóng cửa
    business_start, business_end, working_hours = _business_day_window(db, reservation_time.date())
    reservation_end = min(reservation_time + SERVICE_DURATION, business_end)
    if reservation_end <= reservation_time:
         raise HTTPException(status_code=400, detail="Thời gian đặt không hợp lệ")

    if reservation.id_ban is not None:
        # Áp dụng Pessimistic Locking (.with_for_update()) để ngăn chặn tuyệt đối double-booking khi chịu tải cao
        db_ban = db.query(models.Ban).filter(models.Ban.id_ban == reservation.id_ban).with_for_update().first()
        if not db_ban:
            logger.warning("Đặt bàn thất bại: Không tìm thấy bàn #%s", reservation.id_ban)
            raise HTTPException(status_code=404, detail="Không tìm thấy bàn")
        
        is_rooftop = db_ban.viTri and "Tầng Thượng" in db_ban.viTri.lower()
        if reservation.soNguoi > db_ban.sucChua and not is_rooftop:
            logger.warning("Đặt bàn thất bại: Số người (%s) vượt quá sức chứa bàn #%s (max %s)", 
                           reservation.soNguoi, db_ban.id_ban, db_ban.sucChua)
            raise HTTPException(status_code=400, detail=f"Bàn này chỉ chứa tối đa {db_ban.sucChua} người. Nếu nhóm đông, vui lòng chọn bàn ở Tầng Thượng để nhà hàng hỗ trợ ghép bàn.")

        schedule = _get_table_schedule(db, reservation.id_ban)
        classification = _classify_table_time(schedule, reservation_time)
        if classification["status"] == "occupied":
            logger.warning("Đặt bàn thất bại: Bàn #%s đã có khách đặt vào lúc %s", reservation.id_ban, reservation_time)
            raise HTTPException(status_code=400, detail="Bàn này đã có khách đặt trong khoảng thời gian đó")
        if classification["status"] == "blocked":
            logger.warning("Đặt bàn thất bại: Bàn #%s không đủ thời gian trống trước lượt kế tiếp", reservation.id_ban)
            raise HTTPException(status_code=400, detail="Bàn này không còn đủ thời gian trống")

    db_reservation = models.DatBan(
        id_nguoiDung=current_user.id_nguoiDung,
        id_ban=reservation.id_ban,
        thoiGianDen=reservation_time,
        soNguoi=reservation.soNguoi,
        ghiChu=reservation.ghiChu,
        trangThai="Chờ xác nhận"
    )
    db.add(db_reservation)

    try:
        db.commit()
        db.refresh(db_reservation)
        logger.info("User %s đặt bàn thành công! Mã đơn: #%s, Bàn: #%s", 
                    current_user.id_nguoiDung, db_reservation.id_datBan, db_reservation.id_ban)
    except Exception as exc:
        logger.error("Lỗi hệ thống khi commit đặt bàn của User %s: %s", current_user.id_nguoiDung, str(exc))
        db.rollback()
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi xử lý đặt bàn") from exc

    db_reservation.soPhutGiuChoConLai = _calculate_remaining_hold_minutes(db_reservation)
    return db_reservation

@router.get("/me", response_model=list[schemas.DatBan])
def get_my_reservations(db: Session = Depends(get_db), current_user: models.NguoiDung = Depends(get_current_user)):
    # Tự động xử lý các đặt bàn quá hạn trước khi trả kết quả
    from app.api.auto_noshow import auto_mark_no_show
    auto_mark_no_show(db)

    res_list = (
        db.query(models.DatBan)
        .filter(models.DatBan.id_nguoiDung == current_user.id_nguoiDung)
        .order_by(models.DatBan.id_datBan.desc())
        .all()
    )
    for res in res_list:
        res.soPhutGiuChoConLai = _calculate_remaining_hold_minutes(res)
    return res_list


@router.post("/{id_datBan}/checkin", response_model=schemas.DatBan)
def checkin_reservation(
    id_datBan: int,
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_user),
):
    logger.info("User %s yêu cầu check-in đặt bàn #%s", current_user.id_nguoiDung, id_datBan)
    db_res = (
        db.query(models.DatBan)
        .filter(
            models.DatBan.id_datBan == id_datBan,
            models.DatBan.id_nguoiDung == current_user.id_nguoiDung,
        )
        .first()
    )
    if not db_res:
        logger.warning("Check-in thất bại: Không tìm thấy đặt bàn #%s cho user %s", id_datBan, current_user.id_nguoiDung)
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn đặt bàn của bạn")

    if db_res.trangThai == "Đã checkin":
        logger.warning("Check-in thất bại: Đặt bàn #%s đã được checkin từ trước", id_datBan)
        raise HTTPException(status_code=400, detail="Bạn đã check-in cho bàn này rồi")

    if db_res.trangThai != "Đã xác nhận":
        logger.warning("Check-in thất bại: Trạng thái hiện tại (%s) không hợp lệ", db_res.trangThai)
        raise HTTPException(status_code=400, detail="Chỉ có thể check-in khi đặt bàn đã được xác nhận")

    if not _is_checkin_allowed(db_res.thoiGianDen):
        logger.warning("Check-in thất bại: Chưa đến giờ check-in (%s)", db_res.thoiGianDen)
        raise HTTPException(status_code=400, detail="Chưa đến thời gian check-in cho bàn này")

    db_res.trangThai = "Đã checkin"
    db_res.thoiGianDenThucTe = _now_utc_naive()

    if db_res.id_ban is not None:
        db_ban = db.query(models.Ban).filter(models.Ban.id_ban == db_res.id_ban).first()
        if db_ban:
            db_ban.trangThai = "Có khách"

    # Update related orders
    db_orders = db.query(models.DonHang).filter(
        models.DonHang.id_datBan == id_datBan,
        models.DonHang.tinhTrang == "Chờ khách đến"
    ).all()
    for order in db_orders:
        order.tinhTrang = "Đang chờ món"

    create_notification(
        db,
        vaiTroNhan="Quản lý",
        tieuDe="Khách đã check-in",
        noiDung=f"Khách #{current_user.id_nguoiDung} đã check-in cho bàn #{db_res.id_ban or 'chưa gán bàn'} lúc {db_res.thoiGianDenThucTe.strftime('%H:%M %d/%m/%Y')}.",
        lienKet="/admin/reservations",
    )

    create_notification(
        db,
        vaiTroNhan="Nhân viên phục vụ",
        tieuDe="Khách đã check-in",
        noiDung=f"Khách #{current_user.id_nguoiDung} đã check-in cho bàn #{db_res.id_ban or 'chưa gán bàn'} lúc {db_res.thoiGianDenThucTe.strftime('%H:%M %d/%m/%Y')}.",
        lienKet="/waiter",
    )

    create_notification(
        db,
        id_nguoiDung=current_user.id_nguoiDung,
        tieuDe="Bạn đã check-in thành công",
        noiDung=f"Bạn đã check-in cho bàn #{db_res.id_ban or 'chưa gán bàn'} lúc {db_res.thoiGianDenThucTe.strftime('%H:%M %d/%m/%Y')}.",
        lienKet="/account",
    )

    try:
        db.commit()
        db.refresh(db_res)
        logger.info("User %s check-in thành công đặt bàn #%s", current_user.id_nguoiDung, id_datBan)
    except Exception as exc:
        logger.error("Lỗi commit check-in cho đặt bàn #%s: %s", id_datBan, str(exc))
        db.rollback()
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi check-in") from exc

    db_res.soPhutGiuChoConLai = _calculate_remaining_hold_minutes(db_res)
    return db_res

@router.get("/available", response_model=list[schemas.BanResponse])
def get_available_tables(thoiGianDen: datetime | None = Query(default=None), db: Session = Depends(get_db)):
    tables = db.query(models.Ban).all()

    if thoiGianDen is None:
        return tables

    reservation_time = _normalize_datetime(thoiGianDen)
    _, _, working_hours = _business_day_window(db, reservation_time.date())
    if working_hours["isNghi"]:
        return []

    return [table for table in tables if not _find_conflicting_reservation(db, table.id_ban, reservation_time)]


@router.get("/{id_datBan}", response_model=schemas.DatBan)
def get_reservation(id_datBan: int, db: Session = Depends(get_db)):
    db_res = db.query(models.DatBan).filter(models.DatBan.id_datBan == id_datBan).first()
    if not db_res:
        raise HTTPException(status_code=404, detail="Không tìm thấy đặt bàn")
    db_res.soPhutGiuChoConLai = _calculate_remaining_hold_minutes(db_res)
    return db_res

from pydantic import BaseModel

