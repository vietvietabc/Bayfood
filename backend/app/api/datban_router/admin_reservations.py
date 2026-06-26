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

from .utils import (
    _normalize_datetime, _business_day_window, _clock_to_datetime, 
    _round_datetime_to_hour, _find_conflicting_reservation, 
    _calculate_remaining_hold_minutes, _get_table_schedule, 
    _now_utc_naive, _classify_table_time, _is_checkin_allowed,
    _get_conflicting_reservation, _build_table_timeline,
    _get_active_reservations_for_table, _get_all_reservations_for_table_on_date,
    _clock_to_minutes, _minutes_to_time, _has_time_overlap, _reservation_window,
    validate_restaurant_hours, SERVICE_DURATION, TIMELINE_SLOT_MINUTES
)

@router.get("/all/list", response_model=list[schemas.DatBan])
def get_all_reservations(db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    # Tự động xử lý các đặt bàn quá hạn trước khi trả kết quả
    from app.api.auto_noshow import auto_mark_no_show
    auto_mark_no_show(db)

    reservations = db.query(models.DatBan).order_by(models.DatBan.id_datBan.desc()).all()
    result = []
    for res in reservations:
        res.soPhutGiuChoConLai = _calculate_remaining_hold_minutes(res)
        db_order = db.query(models.DonHang).filter(models.DonHang.id_datBan == res.id_datBan).first()
        res.id_donHang = db_order.id_donHang if db_order else None

        # Enrich với tên khách hàng và tên bàn
        khach = db.query(models.NguoiDung).filter(models.NguoiDung.id_nguoiDung == res.id_nguoiDung).first()
        ban = db.query(models.Ban).filter(models.Ban.id_ban == res.id_ban).first() if res.id_ban else None

        # Build enriched dict
        result.append({
            "id_datBan": res.id_datBan,
            "id_nguoiDung": res.id_nguoiDung,
            "id_ban": res.id_ban,
            "thoiGianDen": res.thoiGianDen,
            "thoiGianDenThucTe": res.thoiGianDenThucTe,
            "soNguoi": res.soNguoi,
            "ghiChu": res.ghiChu,
            "trangThai": res.trangThai,
            "tienCoc": float(res.tienCoc) if res.tienCoc else None,
            "trangThaiCoc": res.trangThaiCoc,
            "lyDoHuy": res.lyDoHuy,
            "id_donHang": res.id_donHang,
            "soPhutGiuChoConLai": res.soPhutGiuChoConLai,
            "tenKhachHang": khach.hoTen if khach else None,
            "tenBan": ban.tenBan if ban else None,
            "viTri": ban.viTri if ban else None,
        })
    return result



@router.get("/timeline")
def get_table_timeline(ngay: date = Query(...), fromTime: str | None = Query(default=None), db: Session = Depends(get_db)):
    try:
        tables = db.query(models.Ban).order_by(models.Ban.id_ban.asc()).all()
        _, _, working_hours = _business_day_window(db, ngay)
        return {
            "ngay": ngay,
            "workingHours": working_hours,
            "tables": [_build_table_timeline(db, table, ngay, working_hours, fromTime) for table in tables],
        }
    except Exception as exc:
        logger.error("Lỗi khi tải timeline ngày %s: %s", ngay, str(exc))
        raise HTTPException(status_code=500, detail=f"Lỗi tải timeline: {str(exc)}")


@router.put("/{id_datBan}/status")
def update_status(id_datBan: int, req: StatusUpdate, db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    db_res = db.query(models.DatBan).filter(models.DatBan.id_datBan == id_datBan).first()
    if not db_res:
        raise HTTPException(status_code=404, detail="Không tìm thấy đặt bàn")

    if req.trangThai in ["Đã xác nhận", "Đã checkin"]:
        _, _, working_hours = _business_day_window(db, db_res.thoiGianDen.date())
        if working_hours["isNghi"]:
            raise HTTPException(status_code=400, detail="Không thể xác nhận hoặc check-in vì quán có lịch nghỉ vào ngày này. Vui lòng hủy đơn đặt bàn.")

    db_ban = None
    if db_res.id_ban is not None:
        db_ban = db.query(models.Ban).filter(models.Ban.id_ban == db_res.id_ban).first()

    old_status = db_res.trangThai
    db_res.trangThai = req.trangThai

    if db_ban is not None:
        if req.trangThai in ["Đã hủy", "Hoàn thành", "Vắng mặt"]:
            # Chỉ giải phóng bàn nếu không còn booking/order nào khác đang active
            active_reservations = db.query(models.DatBan).filter(
                models.DatBan.id_ban == db_ban.id_ban,
                models.DatBan.id_datBan != id_datBan,
                models.DatBan.trangThai.in_(["Đã xác nhận", "Đã checkin"])
            ).count()
            
            active_orders = db.query(models.DonHang).filter(
                models.DonHang.id_ban == db_ban.id_ban,
                models.DonHang.id_datBan != id_datBan,
                models.DonHang.tinhTrang.in_(["Đang chờ món", "Đang phục vụ", "Chờ khách đến"])
            ).count()
            
            if active_reservations == 0 and active_orders == 0:
                db_ban.trangThai = "Trống"
        elif req.trangThai == "Đã xác nhận":
            db_ban.trangThai = "Đã đặt"
        elif req.trangThai == "Đã checkin":
            db_ban.trangThai = "Có khách"
            db_res.thoiGianDenThucTe = db_res.thoiGianDenThucTe or _now_utc_naive()
            
            db_orders = db.query(models.DonHang).filter(
                models.DonHang.id_datBan == id_datBan,
                models.DonHang.tinhTrang == "Chờ khách đến"
            ).all()
            for order in db_orders:
                order.tinhTrang = "Đang chờ món"
                
        elif req.trangThai in ["Đã hủy", "Vắng mặt"]:
            # Đánh dấu hủy cho các đơn hàng liên quan còn đang chờ
            db_orders = db.query(models.DonHang).filter(
                models.DonHang.id_datBan == id_datBan,
                models.DonHang.tinhTrang.in_(["Chờ khách đến", "Đang chờ món", "Đang phục vụ"])
            ).all()
            for order in db_orders:
                order.tinhTrang = req.trangThai

    if req.trangThai == "Đã xác nhận":
        create_notification(
            db,
            id_nguoiDung=db_res.id_nguoiDung,
            tieuDe="Đặt bàn đã được xác nhận",
            noiDung=f"Đặt bàn #{db_res.id_datBan} của bạn đã được admin xác nhận. Bạn chỉ có thể check-in trong vòng 15 phút trước giờ đặt bàn.",
            lienKet="/account",
        )
    elif req.trangThai == "Đã hủy":
        create_notification(
            db,
            id_nguoiDung=db_res.id_nguoiDung,
            tieuDe="Đặt bàn đã bị hủy",
            noiDung=f"Đặt bàn #{db_res.id_datBan} của bạn đã được hủy bởi admin.",
            lienKet="/account",
        )

    db.commit()
    return {"message": "Cập nhật thành công"}


@router.put("/{id_datBan}/deposit")
def set_deposit(
    id_datBan: int,
    req: DepositUpdate,
    db: Session = Depends(get_db),
    current_admin: models.NguoiDung = Depends(get_current_admin),
):
    """Admin đặt mức tiền cọc và cập nhật trạng thái cọc cho lịch đặt bàn."""
    db_res = db.query(models.DatBan).filter(models.DatBan.id_datBan == id_datBan).first()
    if not db_res:
        raise HTTPException(status_code=404, detail="Không tìm thấy đặt bàn")

    db_res.tienCoc = req.tienCoc
    db_res.trangThaiCoc = req.trangThaiCoc
    db.commit()
    db.refresh(db_res)

    # Thông báo cho khách về tiền cọc
    deposit_msg = f"{int(req.tienCoc):,}".replace(",", ".") + " VNĐ"
    create_notification(
        db,
        id_nguoiDung=db_res.id_nguoiDung,
        tieuDe="Yêu cầu đặt cọc",
        noiDung=f"Đặt bàn #{id_datBan} yêu cầu tiền cọc {deposit_msg}. Trạng thái: {req.trangThaiCoc}.",
        lienKet="/account",
    )
    return {"message": "Cập nhật tiền cọc thành công", "tienCoc": db_res.tienCoc, "trangThaiCoc": db_res.trangThaiCoc}


@router.put("/{id_datBan}/no-show")
def mark_no_show(
    id_datBan: int,
    req: NoShowRequest,
    db: Session = Depends(get_db),
    current_admin: models.NguoiDung = Depends(get_current_admin),
):
    """Admin đánh dấu khách vắng mặt quá giờ - tự động mất cọc."""
    db_res = db.query(models.DatBan).filter(models.DatBan.id_datBan == id_datBan).first()
    if not db_res:
        raise HTTPException(status_code=404, detail="Không tìm thấy đặt bàn")

    if db_res.trangThai == "Đã checkin":
        raise HTTPException(status_code=400, detail="Khách đã check-in, không thể đánh dấu vắng mặt")

    if db_res.trangThai in ["Đã hủy", "Hoàn thành", "Vắng mặt"]:
        raise HTTPException(status_code=400, detail=f"Đặt bàn đã ở trạng thái: {db_res.trangThai}")

    now = _now_utc_naive()
    if db_res.thoiGianDen:
        allowed_time = db_res.thoiGianDen + timedelta(hours=1)
        if now < allowed_time:
            remaining_seconds = (allowed_time - now).total_seconds()
            remaining_hours = int(remaining_seconds // 3600)
            remaining_minutes = int((remaining_seconds % 3600) // 60)
            
            time_str = ""
            if remaining_hours > 0:
                time_str += f"{remaining_hours} giờ "
            time_str += f"{remaining_minutes} phút"
            
            raise HTTPException(
                status_code=400,
                detail=f"Chỉ có thể đánh dấu vắng mặt sau giờ hẹn ít nhất 1 tiếng. Vui lòng đợi thêm {time_str}."
            )

    # Đánh dấu vắng mặt
    db_res.trangThai = "Vắng mặt"
    db_res.lyDoHuy = req.lyDoHuy

    # Nếu có tiền cọc → tự động mất cọc
    if db_res.tienCoc and db_res.tienCoc > 0:
        db_res.trangThaiCoc = "Mất cọc"

    # Giải phóng bàn
    if db_res.id_ban:
        db_ban = db.query(models.Ban).filter(models.Ban.id_ban == db_res.id_ban).first()
        if db_ban:
            db_ban.trangThai = "Trống"

    # Đánh dấu vắng mặt cho các đơn hàng liên quan còn đang chờ
    db_orders = db.query(models.DonHang).filter(
        models.DonHang.id_datBan == id_datBan,
        models.DonHang.tinhTrang.in_(["Chờ khách đến", "Đang chờ món"])
    ).all()
    for order in db_orders:
        order.tinhTrang = "Vắng mặt"

    db.commit()

    # Thông báo cho khách
    deposit_info = ""
    if db_res.tienCoc and db_res.tienCoc > 0:
        deposit_info = f" Tiền cọc {int(db_res.tienCoc):,} VNĐ đã bị mất do không đến đúng giờ.".replace(",", ".")

    create_notification(
        db,
        id_nguoiDung=db_res.id_nguoiDung,
        tieuDe="Thông báo vắng mặt",
        noiDung=f"Đặt bàn #{id_datBan} đã bị hủy do bạn không đến đúng giờ.{deposit_info} Lý do: {req.lyDoHuy}",
        lienKet="/account",
    )

    return {
        "message": "Đã đánh dấu vắng mặt thành công",
        "trangThai": db_res.trangThai,
        "trangThaiCoc": db_res.trangThaiCoc,
    }
