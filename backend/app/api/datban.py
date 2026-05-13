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
BUSINESS_OPEN_HOUR = 7


def _normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(second=0, microsecond=0)
    return value.astimezone(timezone.utc).replace(tzinfo=None, second=0, microsecond=0)


def _now_utc_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None, second=0, microsecond=0)


def _reservation_window(thoiGianDen: datetime) -> tuple[datetime, datetime]:
    return thoiGianDen, thoiGianDen + SERVICE_DURATION


def _business_day_window(ngay: date) -> tuple[datetime, datetime]:
    day_start = datetime.combine(ngay, time(hour=BUSINESS_OPEN_HOUR))
    day_end = datetime.combine(ngay + timedelta(days=1), time.min)
    return day_start, day_end


def _has_time_overlap(start_a: datetime, end_a: datetime, start_b: datetime, end_b: datetime) -> bool:
    return start_a < end_b and start_b < end_a


def _get_active_reservations_for_table(db: Session, id_ban: int):
    return (
        db.query(models.DatBan)
        .filter(
            models.DatBan.id_ban == id_ban,
            models.DatBan.trangThai != "Đã hủy",
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

    for item in schedule:
        if item["start"] <= candidate_start < item["occupied_end"]:
            return {
                "status": "occupied",
                "can_dat": False,
                "trangThai": "Đã có người đặt",
                "warningType": None,
                "warningMessage": None,
                "display_end": item["occupied_end"],
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
                "display_end": next_item["start"],
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
                "display_end": next_item["start"],
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
            "display_end": candidate_start + SERVICE_DURATION,
            "conflictingReservation": previous_item["reservation"],
        }

    return {
        "status": "available",
        "can_dat": True,
        "trangThai": "Trống",
        "warningType": None,
        "warningMessage": None,
        "display_end": candidate_start + SERVICE_DURATION,
        "conflictingReservation": None,
    }


def _find_conflicting_reservation(db: Session, id_ban: int, thoiGianDen: datetime):
    schedule = _get_table_schedule(db, id_ban)
    classification = _classify_table_time(schedule, thoiGianDen)

    if classification["status"] in {"occupied", "blocked"}:
        return classification["conflictingReservation"]

    return None


def _build_table_timeline(db: Session, table: models.Ban, ngay: date):
    day_start, day_end = _business_day_window(ngay)
    slot_delta = timedelta(minutes=TIMELINE_SLOT_MINUTES)
    schedule = _get_table_schedule(db, table.id_ban)

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
    last_start = day_end - SERVICE_DURATION
    while current <= last_start:
        if current + slot_delta > day_end:
            break

        classification = _classify_table_time(schedule, current)

        slots.append({
            "batDau": current,
            "ketThuc": classification["display_end"],
            "trangThai": classification["trangThai"],
            "canDat": classification["can_dat"],
            "warningType": classification["warningType"],
            "warningMessage": classification["warningMessage"],
            "id_datBan": classification["conflictingReservation"].id_datBan if classification["conflictingReservation"] else None,
            "thoiGianDen": classification["conflictingReservation"].thoiGianDen if classification["conflictingReservation"] else None,
        })
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
    business_start, business_end = _business_day_window(reservation_time.date())

    if reservation_time <= _now_utc_naive():
        raise HTTPException(status_code=400, detail="Thời gian đặt bàn phải lớn hơn thời gian hiện tại")

    if reservation_time < business_start or reservation_time + SERVICE_DURATION > business_end:
        raise HTTPException(status_code=400, detail="Nhà hàng chỉ nhận đặt từ 7h sáng tới 12h đêm")

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

    create_notification(
        db,
        vaiTroNhan="Quản lý",
        tieuDe="Khách đã check-in",
        noiDung=f"Khách #{current_user.id_nguoiDung} đã check-in cho bàn #{db_res.id_ban or 'chưa gán bàn'} lúc {db_res.thoiGianDenThucTe.strftime('%H:%M %d/%m/%Y')}.",
        lienKet="/admin/reservations",
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
    return db.query(models.DatBan).order_by(models.DatBan.id_datBan.desc()).all()


@router.get("/available", response_model=list[schemas.BanResponse])
def get_available_tables(thoiGianDen: datetime | None = Query(default=None), db: Session = Depends(get_db)):
    tables = db.query(models.Ban).all()

    if thoiGianDen is None:
        return tables

    reservation_time = _normalize_datetime(thoiGianDen)
    return [table for table in tables if not _find_conflicting_reservation(db, table.id_ban, reservation_time)]


@router.get("/timeline")
def get_table_timeline(ngay: date = Query(...), db: Session = Depends(get_db)):
    tables = db.query(models.Ban).order_by(models.Ban.id_ban.asc()).all()
    return [_build_table_timeline(db, table, ngay) for table in tables]


@router.get("/{id_datBan}", response_model=schemas.DatBan)
def get_reservation(id_datBan: int, db: Session = Depends(get_db)):
    db_res = db.query(models.DatBan).filter(models.DatBan.id_datBan == id_datBan).first()
    if not db_res:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return db_res

from pydantic import BaseModel

class StatusUpdate(BaseModel):
    trangThai: str

@router.put("/{id_datBan}/status")
def update_status(id_datBan: int, req: StatusUpdate, db: Session = Depends(get_db), current_admin: models.NguoiDung = Depends(get_current_admin)):
    db_res = db.query(models.DatBan).filter(models.DatBan.id_datBan == id_datBan).first()
    if not db_res:
        raise HTTPException(status_code=404, detail="Reservation not found")

    db_ban = None
    if db_res.id_ban is not None:
        db_ban = db.query(models.Ban).filter(models.Ban.id_ban == db_res.id_ban).first()

    db_res.trangThai = req.trangThai

    if db_ban is not None:
        if req.trangThai == "Đã hủy":
            db_ban.trangThai = "Trống"
        elif req.trangThai == "Đã xác nhận":
            db_ban.trangThai = "Đã đặt"
        elif req.trangThai == "Đã checkin":
            db_ban.trangThai = "Có khách"
            db_res.thoiGianDenThucTe = db_res.thoiGianDenThucTe or _now_utc_naive()

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
