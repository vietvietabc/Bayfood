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


from pydantic import BaseModel


SERVICE_DURATION = timedelta(hours=3)
TIMELINE_SLOT_MINUTES = 60


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
    # Luôn sử dụng giờ Việt Nam (GMT+7) độc lập với múi giờ của server
    return datetime.now(timezone(timedelta(hours=7))).replace(tzinfo=None, second=0, microsecond=0)


def _calculate_remaining_hold_minutes(db_res: models.DatBan) -> int | None:
    if db_res.trangThai not in ["Đã xác nhận", "Chờ xác nhận", "Đã đặt"]:
        return None
    
    now = _now_utc_naive()
    limit_time = db_res.thoiGianDen + timedelta(hours=3)
    if now >= limit_time:
        return 0
    return int((limit_time - now).total_seconds() / 60)


def _reservation_window(thoiGianDen: datetime) -> tuple[datetime, datetime]:
    return thoiGianDen, thoiGianDen + SERVICE_DURATION


DEFAULT_OPEN_TIME = "07:00"
DEFAULT_CLOSE_TIME = "24:00"

def _business_day_window(db: Session, ngay: date) -> tuple[datetime, datetime, dict]:
    working_hours = {
        "isNghi": False,
        "gioMoCua": DEFAULT_OPEN_TIME,
        "gioDongCua": DEFAULT_CLOSE_TIME
    }
    day_start = _clock_to_datetime(ngay, DEFAULT_OPEN_TIME)
    day_end = _clock_to_datetime(ngay, DEFAULT_CLOSE_TIME)
    return day_start, day_end, working_hours


def _has_time_overlap(start_a: datetime, end_a: datetime, start_b: datetime, end_b: datetime) -> bool:
    return start_a < end_b and start_b < end_a



def _get_active_reservations_for_table(db: Session, id_ban: int, exclude_id_datBan: int = None):

    query = db.query(models.DatBan).filter(
        models.DatBan.id_ban == id_ban,
        ~models.DatBan.trangThai.in_(["Đã hủy", "Hoàn thành", "Vắng mặt"]),
    )
    if exclude_id_datBan:
        query = query.filter(models.DatBan.id_datBan != exclude_id_datBan)
    
    direct_reservations = query.all()

    # Lấy các đặt bàn qua ghép bàn
    try:
        from app.api.ghepban import _merge_registry
        for id_datBan, info in _merge_registry.items():
            if id_ban in info["ban_ids"]:
                if exclude_id_datBan and id_datBan == exclude_id_datBan:
                    continue
                if any(r.id_datBan == id_datBan for r in direct_reservations):
                    continue
                db_datban = db.query(models.DatBan).filter(
                    models.DatBan.id_datBan == id_datBan,
                    ~models.DatBan.trangThai.in_(["Đã hủy", "Hoàn thành", "Vắng mặt"])
                ).first()
                if db_datban:
                    direct_reservations.append(db_datban)
    except ImportError:
        pass

    direct_reservations.sort(key=lambda r: r.thoiGianDen)
    return direct_reservations


def _get_all_reservations_for_table_on_date(db: Session, id_ban: int, ngay: date):

    day_start = datetime.combine(ngay, time.min)
    day_end = datetime.combine(ngay + timedelta(days=1), time.min)
    
    direct_reservations = db.query(models.DatBan).filter(
        models.DatBan.id_ban == id_ban,
        models.DatBan.trangThai != "Đã hủy",
        models.DatBan.thoiGianDen >= day_start,
        models.DatBan.thoiGianDen < day_end,
    ).all()

    # Lấy các đặt bàn qua ghép bàn
    try:
        from app.api.ghepban import _merge_registry
        for id_datBan, info in _merge_registry.items():
            if id_ban in info["ban_ids"]:
                if any(r.id_datBan == id_datBan for r in direct_reservations):
                    continue
                db_datban = db.query(models.DatBan).filter(
                    models.DatBan.id_datBan == id_datBan,
                    models.DatBan.trangThai != "Đã hủy",
                    models.DatBan.thoiGianDen >= day_start,
                    models.DatBan.thoiGianDen < day_end,
                ).first()
                if db_datban:
                    direct_reservations.append(db_datban)
    except ImportError:
        pass

    direct_reservations.sort(key=lambda r: r.thoiGianDen)
    return direct_reservations


def _get_table_schedule(db: Session, id_ban: int, exclude_id_datBan: int = None):
    reservations = [
        {
            "reservation": reservation,
            "start": _normalize_datetime(reservation.thoiGianDen),
        }
        for reservation in _get_active_reservations_for_table(db, id_ban, exclude_id_datBan)
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


def _find_conflicting_reservation(db: Session, id_ban: int, thoiGianDen: datetime, exclude_id_datBan: int = None):
    schedule = _get_table_schedule(db, id_ban, exclude_id_datBan)
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

    # Khi xem ngày quá khứ: dùng query đầy đủ bao gồm cả "Hoàn thành" / "Vắng mặt"
    # để hiển thị đúng lịch sử các đặt bàn trong ngày đó.
    today = _now_utc_naive().date()
    if ngay < today:
        # Ngày quá khứ: lấy tất cả đặt bàn (trừ đã hủy)
        raw_reservations = _get_all_reservations_for_table_on_date(db, table.id_ban, ngay)
        schedule = []
        for i, res in enumerate(raw_reservations):
            start = _normalize_datetime(res.thoiGianDen)
            next_start = _normalize_datetime(raw_reservations[i + 1].thoiGianDen) if i + 1 < len(raw_reservations) else None
            occupied_end = start + SERVICE_DURATION
            if next_start is not None and next_start < occupied_end:
                occupied_end = next_start
            schedule.append({"reservation": res, "start": start, "occupied_end": occupied_end, "next_start": next_start})
    else:
        schedule = _get_table_schedule(db, table.id_ban)

    # Với ngày quá khứ mà không có giờ làm việc (isNghi), vẫn fallback sang giờ mặc định
    # để hiển thị lịch sử đặt bàn nếu có
    if working_hours["isNghi"] and ngay < today:
        # Dùng giờ mặc định cho ngày nghỉ quá khứ
        day_start = datetime.combine(ngay, time(hour=int(DEFAULT_OPEN_TIME.split(":")[0]), minute=int(DEFAULT_OPEN_TIME.split(":")[1])))
        day_end = datetime.combine(ngay, time(hour=int(DEFAULT_CLOSE_TIME.split(":")[0]) if DEFAULT_CLOSE_TIME != "24:00" else 0,
                                              minute=int(DEFAULT_CLOSE_TIME.split(":")[1]) if DEFAULT_CLOSE_TIME != "24:00" else 0))
        if DEFAULT_CLOSE_TIME == "24:00":
            day_end = datetime.combine(ngay + timedelta(days=1), time.min)
        # Nếu không có reservations thì vẫn trả về empty
        if not schedule:
            return {
                "table": {
                    "id_ban": table.id_ban, "tenBan": table.tenBan, "sucChua": table.sucChua,
                    "viTri": table.viTri, "trangThai": table.trangThai, "maQR_url": table.maQR_url,
                    "hinhAnh": table.hinhAnh,
                    "tienCocMacDinh": float(table.tienCocMacDinh) if table.tienCocMacDinh else 0,
                },
                "reservations": [], "slots": [],
            }
    elif working_hours["isNghi"]:
        return {
            "table": {
                "id_ban": table.id_ban,
                "tenBan": table.tenBan,
                "sucChua": table.sucChua,
                "viTri": table.viTri,
                "trangThai": table.trangThai,
                "maQR_url": table.maQR_url,
                "hinhAnh": table.hinhAnh,
                "tienCocMacDinh": float(table.tienCocMacDinh) if table.tienCocMacDinh else 0,
            },
            "reservations": [],
            "slots": [],
        }

    reservations = []
    for item in schedule:
        reservation_start = item["start"]
        reservation_end = item["occupied_end"]
        
        # Vẫn hiển thị tất cả reservation trong ngày (kể cả đã kết thúc)
        # để admin có thể xem lịch sử
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
            "tienCocMacDinh": float(table.tienCocMacDinh) if table.tienCocMacDinh else 0,
        },
        "reservations": reservations,
        "slots": slots,
    }


def _get_conflicting_reservation(db: Session, id_ban: int, thoiGianDen: datetime):
    return _find_conflicting_reservation(db, id_ban, thoiGianDen)


def _is_checkin_allowed(thoiGianDen: datetime) -> bool:
    return _now_utc_naive() >= (thoiGianDen - timedelta(minutes=15))


def validate_restaurant_hours(db, target_dt, is_booking=False):
    pass



class StatusUpdate(BaseModel):
    trangThai: str

class DepositUpdate(BaseModel):
    tienCoc: float
    trangThaiCoc: str = "Chưa cọc"  # 'Chưa cọc' | 'Đã cọc' | 'Mất cọc' | 'Hoàn cọc'

class NoShowRequest(BaseModel):
    lyDoHuy: str = "Khách không đến đúng giờ"


