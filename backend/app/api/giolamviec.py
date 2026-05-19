from datetime import date, timedelta
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.auth import get_current_admin
from app import models, schemas
from app.db.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/gio-lam-viec", tags=["Giờ làm việc"])

DEFAULT_OPEN_TIME = "07:00"
DEFAULT_CLOSE_TIME = "24:00"


def _validate_clock(value: str | None, field_name: str) -> str | None:
    if value is None or value == "":
        return None

    if value == "24:00":
        return value

    try:
        hours, minutes = value.split(":")
        hour_value = int(hours)
        minute_value = int(minutes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"{field_name} phải có định dạng HH:MM") from exc

    if not (0 <= hour_value <= 23 and 0 <= minute_value <= 59):
        raise HTTPException(status_code=400, detail=f"{field_name} phải nằm trong khoảng thời gian hợp lệ")

    return f"{hour_value:02d}:{minute_value:02d}"


def serialize_working_hours(record: models.GioLamViec | None, target_date: date) -> dict:
    if record is None:
        return {
            "id_gioLamViec": None,
            "ngay": target_date,
            "gioMoCua": DEFAULT_OPEN_TIME,
            "gioDongCua": DEFAULT_CLOSE_TIME,
            "isNghi": False,
            "ghiChu": None,
            "source": "default",
        }

    is_nghi = bool(record.isNghi)
    return {
        "id_gioLamViec": record.id_gioLamViec,
        "ngay": record.ngay,
        "gioMoCua": None if is_nghi else (record.gioMoCua or DEFAULT_OPEN_TIME),
        "gioDongCua": None if is_nghi else (record.gioDongCua or DEFAULT_CLOSE_TIME),
        "isNghi": is_nghi,
        "ghiChu": record.ghiChu,
        "source": "custom",
    }


@router.get("", response_model=schemas.GioLamViecResponse)
def get_working_hours(
    ngay: date = Query(default_factory=date.today),
    db: Session = Depends(get_db),
):
    record = db.query(models.GioLamViec).filter(models.GioLamViec.ngay == ngay).first()
    return serialize_working_hours(record, ngay)


@router.put("", response_model=schemas.GioLamViecResponse)
def upsert_working_hours(
    payload: schemas.GioLamViecCreate,
    db: Session = Depends(get_db),
    current_admin: models.NguoiDung = Depends(get_current_admin),
):
    _ = current_admin
    logger.info("Admin %s đang cập nhật giờ làm việc ngày %s. isNghi: %s", current_admin.id_nguoiDung, payload.ngay, payload.isNghi)
    open_time = _validate_clock(payload.gioMoCua, "Giờ mở cửa")
    close_time = _validate_clock(payload.gioDongCua, "Giờ đóng cửa")

    if payload.isNghi:
        open_time = None
        close_time = None
    else:
        if open_time is None or close_time is None:
            logger.warning("Cập nhật thất bại: Thiếu giờ mở/đóng cửa khi không phải ngày nghỉ")
            raise HTTPException(status_code=400, detail="Vui lòng nhập đầy đủ giờ mở và giờ đóng cửa")

        if open_time == close_time:
            logger.warning("Cập nhật thất bại: Giờ mở trùng giờ đóng cửa (%s)", open_time)
            raise HTTPException(status_code=400, detail="Giờ mở và giờ đóng cửa không được trùng nhau")

    record = db.query(models.GioLamViec).filter(models.GioLamViec.ngay == payload.ngay).first()
    if record is None:
        logger.info("Tạo mới lịch làm việc cho ngày %s", payload.ngay)
        record = models.GioLamViec(ngay=payload.ngay)
        db.add(record)

    record.gioMoCua = open_time
    record.gioDongCua = close_time
    record.isNghi = payload.isNghi
    record.ghiChu = payload.ghiChu

    try:
        db.commit()
        db.refresh(record)
        logger.info("Cập nhật thành công lịch làm việc ngày %s", payload.ngay)
    except Exception as exc:
        logger.error("Lỗi khi ghi lịch làm việc ngày %s: %s", payload.ngay, str(exc))
        db.rollback()
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi cập nhật lịch làm việc") from exc

    return serialize_working_hours(record, payload.ngay)


@router.get("/range", response_model=list[schemas.GioLamViecResponse])
def get_working_hours_range(
    tu_ngay: date = Query(...),
    den_ngay: date = Query(...),
    db: Session = Depends(get_db),
):
    if tu_ngay > den_ngay:
        raise HTTPException(status_code=400, detail="Từ ngày không được lớn hơn đến ngày")

    records = db.query(models.GioLamViec).filter(
        models.GioLamViec.ngay >= tu_ngay,
        models.GioLamViec.ngay <= den_ngay
    ).all()
    records_map = {r.ngay: r for r in records}

    results = []
    current_date = tu_ngay
    while current_date <= den_ngay:
        results.append(serialize_working_hours(records_map.get(current_date), current_date))
        current_date += timedelta(days=1)

    return results

