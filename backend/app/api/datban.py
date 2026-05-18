from datetime import datetime, timedelta, timezone, date, time

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app import models
from app import schemas
from app.api.auth import get_current_admin, get_current_user
from app.api.thongbao import create_notification
router = APIRouter(prefix="/api/datban", tags=["Đặt Bàn"])

SERVICE_DURATION = timedelta(hours=3)
TIMELINE_SLOT_MINUTES = 60
DEFAULT_OPEN_TIME = "07:00"
DEFAULT_CLOSE_TIME = "24:00"


def _clock_to_minutes(value: str) -> int:
    if value == "24:00":
        return 24 * 60

    hours, minutes = value.split(":")
    return (int(hours) * 60) + int(minutes)


def _minutes_to_time(minutes: int) -> time:
    normalized = minutes % (24 * 60)
    return time(hour=normalized // 60, minute=normalized % 60)


def _clock_to_datetime(ngay: date, value: str) -> datetime:
    if value == "24:00":
        return datetime.combine(ngay + timedelta(days=1), time.min)

    return datetime.combine(ngay, _minutes_to_time(_clock_to_minutes(value)))


def _round_datetime_to_hour(value: datetime) -> datetime:
    minute = value.minute
    rounded = value.replace(minute=0, second=0, microsecond=0)

    if minute >= 30:
        rounded += timedelta(hours=1)

    return rounded


def _normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(second=0, microsecond=0)
    return value.astimezone(timezone.utc).replace(tzinfo=None, second=0, microsecond=0)


def _now_utc_naive() -> datetime:
    return datetime.now().replace(second=0, microsecond=0)


def _reservation_window(thoiGianDen: datetime) -> tuple[datetime, datetime]:
    return thoiGianDen, thoiGianDen + SERVICE_DURATION


def _get_working_hours_record(db: Session, ngay: date):
    return db.query(models.GioLamViec).filter(models.GioLamViec.ngay == ngay).first()


def _serialize_working_hours(record, ngay: date) -> dict:
    if record is None:
        return {
            "id_gioLamViec": None,
            "ngay": ngay,
            "gioMoCua": DEFAULT_OPEN_TIME,
            "gioDongCua": DEFAULT_CLOSE_TIME,
            "isNghi": False,
            "ghiChu": None,
            "source": "default",
        }

    return {
        "id_gioLamViec": record.id_gioLamViec,
        "ngay": record.ngay,
        "gioMoCua": record.gioMoCua or DEFAULT_OPEN_TIME,
        "gioDongCua": record.gioDongCua or DEFAULT_CLOSE_TIME,
        "isNghi": bool(record.isNghi),
        "ghiChu": record.ghiChu,
        "source": "custom",
    }


def _business_day_window(db: Session, ngay: date) -> tuple[datetime, datetime, dict]:
    working_hours = _serialize_working_hours(_get_working_hours_record(db, ngay), ngay)
    if working_hours["isNghi"]:
        day_start = datetime.combine(ngay, time.min)
        return day_start, day_start, working_hours

    day_start = _clock_to_datetime(ngay, working_hours["gioMoCua"])
    day_end = _clock_to_datetime(ngay, working_hours["gioDongCua"])
    if day_end <= day_start:
        raise HTTPException(status_code=400, detail="Giờ đóng cửa phải lớn hơn giờ mở cửa")
    return day_start, day_end, working_hours


def _has_time_overlap(start_a: datetime, end_a: datetime, start_b: datetime, end_b: datetime) -> bool:
    return start_a < end_b and start_b < end_a


def _get_active_reservations_for_table(db: Session, id_ban: int):
    return (
        db.query(models.DatBan)
        .filter(
            models.DatBan.id_ban == id_ban,
            ~models.DatBan.trangThai.in_(["Đã hủy", "Hoàn thành"]),
        )
        .order_by(models.DatBan.thoiGianDen.asc())
        .all()
    )


def _get_table_schedule(db: Session, id_ban: int):
    reservations = [
        {
            "reservation": reservation,
            "start": _normalize_datetime(reservation.thoiGianDen),
        }
        for reservation in _get_active_reservations_for_table(db, id_ban)
    ]
    reservations.sort(key=lambda item: item["start"])

    schedule = []
    for index, item in enumerate(reservations):
        next_start = reservations[index + 1]["start"] if index + 1 < len(reservations) else None
        occupied_end = item["start"] + SERVICE_DURATION
        if next_start is not None and next_start < occupied_end:
            occupied_end = next_start

        schedule.append({
            "reservation": item["reservation"],
            "start": item["start"],
            "occupied_end": occupied_end,
            "next_start": next_start,
        })

    return schedule


def _classify_table_time(schedule, candidate_start: datetime):
    candidate_start = _normalize_datetime(candidate_start)
    display_candidate_end = _round_datetime_to_hour(candidate_start + SERVICE_DURATION)

    for item in schedule:
        if item["start"] <= candidate_start < item["occupied_end"]:
            return {
                "status": "occupied",
                "can_dat": False,
                "trangThai": "Đã có người đặt",
                "warningType": None,
                "warningMessage": None,
                "display_end": _round_datetime_to_hour(item["occupied_end"]),
                "conflictingReservation": item["reservation"],
            }

    next_item = next((item for item in schedule if item["start"] > candidate_start), None)
    if next_item is not None:
        gap = next_item["start"] - candidate_start
        if gap < timedelta(hours=1):
            return {
                "status": "blocked",
                "can_dat": False,
                "trangThai": "Không đủ thời gian",
                "warningType": None,
                "warningMessage": None,
                "display_end": _round_datetime_to_hour(next_item["start"]),
                "conflictingReservation": next_item["reservation"],
            }

        if gap < SERVICE_DURATION:
            next_time = next_item["start"].strftime("%H:%M")
            return {
                "status": "warning_next",
                "can_dat": True,
                "trangThai": "Có giới hạn giờ",
                "warningType": "next",
                "warningMessage": f"Bàn này đã có người đặt vào lúc {next_time}, bạn chỉ có thể dùng bữa đến {next_time}. Bạn có chắc chắn muốn đặt không?",
                "display_end": _round_datetime_to_hour(next_item["start"]),
                "conflictingReservation": next_item["reservation"],
            }

    previous_item = next((item for item in reversed(schedule) if item["occupied_end"] == candidate_start), None)
    if previous_item is not None:
        return {
            "status": "warning_previous",
            "can_dat": True,
            "trangThai": "Có giới hạn giờ",
            "warningType": "previous",
            "warningMessage": "Khung giờ này có thể khách hàng trước chưa dùng xong bữa. Bạn có chắc chắn muốn đặt không?",
            "display_end": display_candidate_end,
            "conflictingReservation": previous_item["reservation"],
        }

    return {
        "status": "available",
        "can_dat": True,
        "trangThai": "Trống",
        "warningType": None,
        "warningMessage": None,
        "display_end": display_candidate_end,
        "conflictingReservation": None,
    }


def _find_conflicting_reservation(db: Session, id_ban: int, thoiGianDen: datetime):
    schedule = _get_table_schedule(db, id_ban)
    classification = _classify_table_time(schedule, thoiGianDen)

    if classification["status"] in {"occupied", "blocked"}:
        return classification["conflictingReservation"]

    return None


def _build_table_timeline(db: Session, table: models.Ban, ngay: date, working_hours: dict, requested_from_time: str | None = None):
    day_start, day_end, _ = _business_day_window(db, ngay)
    if requested_from_time:
        requested_start = _clock_to_datetime(ngay, requested_from_time)
        if requested_start > day_start:
            day_start = requested_start
    slot_delta = timedelta(minutes=TIMELINE_SLOT_MINUTES)
    schedule = _get_table_schedule(db, table.id_ban)

    if working_hours["isNghi"]:
        return {
            "table": {
                "id_ban": table.id_ban,
                "tenBan": table.tenBan,
                "sucChua": table.sucChua,
                "viTri": table.viTri,
                "trangThai": table.trangThai,
                "maQR_url": table.maQR_url,
                "hinhAnh": table.hinhAnh,
            },
            "reservations": [],
            "slots": [],
        }

    reservations = []
    for item in schedule:
        reservation_start = item["start"]
        reservation_end = item["occupied_end"]
        if reservation_end <= day_start or reservation_start >= day_end:
            continue

        reservations.append({
            "id_datBan": item["reservation"].id_datBan,
            "thoiGianDen": item["reservation"].thoiGianDen,
            "thoiGianKetThuc": reservation_end,
            "trangThai": item["reservation"].trangThai,
            "soNguoi": item["reservation"].soNguoi,
        })

    slots = []
    current = day_start
    # Cho phép đặt đến trước giờ đóng cửa tối thiểu 2 tiếng (ví dụ 22:00 nếu đóng 24:00)
    last_start = day_end - timedelta(hours=2)
    used_requested_start = False
    while current <= last_start:
        if current + slot_delta > day_end:
            break

        classification = _classify_table_time(schedule, current)

        slots.append({
            "batDau": current,
            "ketThuc": min(classification["display_end"], day_end),
            "trangThai": classification["trangThai"],
            "canDat": classification["can_dat"],
            "warningType": classification["warningType"],
            "warningMessage": classification["warningMessage"],
            "id_datBan": classification["conflictingReservation"].id_datBan if classification["conflictingReservation"] else None,
            "thoiGianDen": classification["conflictingReservation"].thoiGianDen if classification["conflictingReservation"] else None,
        })

        if requested_from_time and not used_requested_start and current.minute != 0:
            current = (current.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1))
            used_requested_start = True
        else:
            current = current + slot_delta

    return {
        "table": {
            "id_ban": table.id_ban,
            "tenBan": table.tenBan,
            "sucChua": table.sucChua,
            "viTri": table.viTri,
            "trangThai": table.trangThai,
            "maQR_url": table.maQR_url,
            "hinhAnh": table.hinhAnh,
        },
        "reservations": reservations,
        "slots": slots,
    }


def _get_conflicting_reservation(db: Session, id_ban: int, thoiGianDen: datetime):
    return _find_conflicting_reservation(db, id_ban, thoiGianDen)


def _is_checkin_allowed(thoiGianDen: datetime) -> bool:
    return _now_utc_naive() >= (thoiGianDen - timedelta(minutes=15))

@router.post("/", response_model=schemas.DatBan)
def create_reservation(reservation: schemas.DatBanCreateCustomer, db: Session = Depends(get_db), current_user: models.NguoiDung = Depends(get_current_user)):
    reservation_time = _normalize_datetime(reservation.thoiGianDen)
    business_start, business_end, working_hours = _business_day_window(db, reservation_time.date())

    if working_hours["isNghi"]:
        raise HTTPException(status_code=400, detail="Nhà hàng nghỉ vào ngày bạn đã chọn")

    if reservation_time <= _now_utc_naive():
        raise HTTPException(status_code=400, detail="Thời gian đặt bàn phải lớn hơn thời gian hiện tại")

    if reservation_time < business_start or reservation_time > (business_end - timedelta(hours=2)):
        raise HTTPException(status_code=400, detail="Nhà hàng chỉ nhận đặt muộn nhất là 22:00")

    # Nếu đặt muộn (sau 21h), thời gian dùng bữa sẽ bị giới hạn bởi giờ đóng cửa
    reservation_end = min(reservation_time + SERVICE_DURATION, business_end)
    if reservation_end <= reservation_time:
         raise HTTPException(status_code=400, detail="Thời gian đặt không hợp lệ")

    if reservation.id_ban is not None:
        db_ban = db.query(models.Ban).filter(models.Ban.id_ban == reservation.id_ban).first()
        if not db_ban:
            raise HTTPException(status_code=404, detail="Không tìm thấy bàn")
        schedule = _get_table_schedule(db, reservation.id_ban)
        classification = _classify_table_time(schedule, reservation_time)
        if classification["status"] == "occupied":
            raise HTTPException(status_code=400, detail="Bàn này đã có khách đặt trong khoảng thời gian đó")
        if classification["status"] == "blocked":
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

    db.commit()
    db.refresh(db_reservation)
    return db_reservation

@router.get("/me", response_model=list[schemas.DatBan])
def get_my_reservations(db: Session = Depends(get_db), current_user: models.NguoiDung = Depends(get_current_user)):
    return (
        db.query(models.DatBan)
        .filter(models.DatBan.id_nguoiDung == current_user.id_nguoiDung)
        .order_by(models.DatBan.id_datBan.desc())
        .all()
    )


@router.post("/{id_datBan}/checkin", response_model=schemas.DatBan)
def checkin_reservation(
    id_datBan: int,
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_user),
):
    db_res = (
        db.query(models.DatBan)
        .filter(
            models.DatBan.id_datBan == id_datBan,
            models.DatBan.id_nguoiDung == current_user.id_nguoiDung,
        )
        .first()
    )
    if not db_res:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn đặt bàn của bạn")

    if db_res.trangThai == "Đã checkin":
        raise HTTPException(status_code=400, detail="Bạn đã check-in cho bàn này rồi")

    if db_res.trangThai != "Đã xác nhận":
        raise HTTPException(status_code=400, detail="Chỉ có thể check-in khi đặt bàn đã được xác nhận")

    if not _is_checkin_allowed(db_res.thoiGianDen):
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

    db.commit()
    db.refresh(db_res)
    return db_res

@router.get("/all/list", response_model=list[schemas.DatBan])
def get_all_reservations(db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    reservations = db.query(models.DatBan).order_by(models.DatBan.id_datBan.desc()).all()
    for res in reservations:
        db_order = db.query(models.DonHang).filter(models.DonHang.id_datBan == res.id_datBan).first()
        if db_order:
            res.id_donHang = db_order.id_donHang
            if db_order.tinhTrang == "Đã thanh toán":
                res.kieuCoc = "Cọc hết đơn"
            elif res.trangThaiCoc == "Đã cọc":
                res.kieuCoc = "Cọc 10% + tiền bàn"
            else:
                res.kieuCoc = "Chưa cọc"
        else:
            res.id_donHang = None
            if res.trangThaiCoc == "Đã cọc":
                res.kieuCoc = "Cọc 10% + tiền bàn"
            else:
                res.kieuCoc = "Chưa cọc"
    return reservations


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


@router.get("/timeline")
def get_table_timeline(ngay: date = Query(...), fromTime: str | None = Query(default=None), db: Session = Depends(get_db)):
    tables = db.query(models.Ban).order_by(models.Ban.id_ban.asc()).all()
    working_hours = _serialize_working_hours(_get_working_hours_record(db, ngay), ngay)
    return {
        "ngay": ngay,
        "workingHours": working_hours,
        "tables": [_build_table_timeline(db, table, ngay, working_hours, fromTime) for table in tables],
    }


@router.get("/{id_datBan}", response_model=schemas.DatBan)
def get_reservation(id_datBan: int, db: Session = Depends(get_db)):
    db_res = db.query(models.DatBan).filter(models.DatBan.id_datBan == id_datBan).first()
    if not db_res:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return db_res

from pydantic import BaseModel

class StatusUpdate(BaseModel):
    trangThai: str

class DepositUpdate(BaseModel):
    tienCoc: float
    trangThaiCoc: str = "Chưa cọc"  # 'Chưa cọc' | 'Đã cọc' | 'Mất cọc' | 'Hoàn cọc'

class NoShowRequest(BaseModel):
    lyDoHuy: str = "Khách không đến đúng giờ"

@router.put("/{id_datBan}/status")
def update_status(id_datBan: int, req: StatusUpdate, db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    db_res = db.query(models.DatBan).filter(models.DatBan.id_datBan == id_datBan).first()
    if not db_res:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if req.trangThai in ["Đã xác nhận", "Đã checkin"]:
        working_hours = _get_working_hours_record(db, db_res.thoiGianDen.date())
        if working_hours and working_hours.isNghi:
            raise HTTPException(status_code=400, detail="Không thể xác nhận hoặc check-in vì quán có lịch nghỉ vào ngày này. Vui lòng hủy đơn đặt bàn.")

    db_ban = None
    if db_res.id_ban is not None:
        db_ban = db.query(models.Ban).filter(models.Ban.id_ban == db_res.id_ban).first()

    db_res.trangThai = req.trangThai

    if db_ban is not None:
        if req.trangThai in ["Đã hủy", "Hoàn thành"]:
            db_ban.trangThai = "Trống"
        elif req.trangThai == "Đã xác nhận":
            db_ban.trangThai = "Đã đặt"
        elif req.trangThai == "Đã checkin":
            db_ban.trangThai = "Có khách"
            db_res.thoiGianDenThucTe = db_res.thoiGianDenThucTe or _now_utc_naive()
            
            # Update related orders
            db_orders = db.query(models.DonHang).filter(
                models.DonHang.id_datBan == id_datBan,
                models.DonHang.tinhTrang == "Chờ khách đến"
            ).all()
            for order in db_orders:
                order.tinhTrang = "Đang chờ món"

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
        allowed_time = db_res.thoiGianDen + timedelta(hours=3)
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
                detail=f"Chỉ có thể đánh dấu vắng mặt sau giờ hẹn ít nhất 3 tiếng. Vui lòng đợi thêm {time_str}."
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
