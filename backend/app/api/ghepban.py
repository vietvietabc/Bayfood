"""
API Ghép Bàn — Tính năng gộp nhiều bàn tầng thượng để phục vụ nhóm khách đông.

Lưu ý: Dữ liệu ghép bàn lưu trong bộ nhớ (in-memory), giống pattern _table_holds trong ban.py.
       Sẽ mất khi server restart — chấp nhận được vì đây là nghiệp vụ vận hành trong ngày.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app import models
from app.api.auth import get_current_staff
from app.api.datban import _find_conflicting_reservation, _normalize_datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ghepban", tags=["Ghép Bàn"])


_merge_registry: dict[int, dict] = {}

ROOFTOP_KEYWORD = "Tầng Thượng"


def _is_rooftop(viTri: str) -> bool:
    """Kiểm tra bàn có thuộc Tầng Thượng không (case-insensitive)."""
    return ROOFTOP_KEYWORD.lower() in (viTri or "").lower()


# ─── Schemas ──────────────────────────────────────────────────────────────────

class GhepBanRequest(BaseModel):
    ban_ids: list[int]
    ghi_chu: Optional[str] = None
    so_nguoi_moi: Optional[int] = None  # Cập nhật số người nếu cần


MARKER = "[GHÉP BÀN]"  # prefix để nhận dạng ghi chú tự động


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/tables")
def get_rooftop_tables(
    thoiGianDen: Optional[datetime] = Query(default=None, description="Thời gian khách đến (ISO 8601). Nếu có sẽ lọc bàn không bị trùng lịch."),
    id_datBan: Optional[int] = Query(default=None, description="ID của đặt bàn hiện tại để bỏ qua khi kiểm tra trùng lịch."),
    db: Session = Depends(get_db),
    current_admin: models.NguoiDung = Depends(get_current_staff),
):

    tables = db.query(models.Ban).filter(
        models.Ban.viTri.ilike(f"%{ROOFTOP_KEYWORD}%")
    ).all()

    result = []
    for table in tables:
        conflict = None
        if thoiGianDen is not None:
            arrival = _normalize_datetime(thoiGianDen)
            conflict = _find_conflicting_reservation(db, table.id_ban, arrival, exclude_id_datBan=id_datBan)

        result.append({
            "id_ban": table.id_ban,
            "tenBan": table.tenBan,
            "sucChua": table.sucChua,
            "viTri": table.viTri,
            "trangThai": table.trangThai,
            "maQR_url": table.maQR_url,
            "hinhAnh": table.hinhAnh,
            "coLichTrungGio": conflict is not None,  
        })

    return result


@router.get("/")
def list_all_merges(
    current_admin: models.NguoiDung = Depends(get_current_staff),
    db: Session = Depends(get_db),
):

    result = []
    for id_datBan, info in _merge_registry.items():
        # Enrich tên bàn
        ban_details = []
        for bid in info["ban_ids"]:
            ban = db.query(models.Ban).filter(models.Ban.id_ban == bid).first()
            if ban:
                ban_details.append({"id_ban": ban.id_ban, "tenBan": ban.tenBan, "sucChua": ban.sucChua})

        result.append({
            "id_datBan": id_datBan,
            "ban_ids": info["ban_ids"],
            "ban_details": ban_details,
            "tong_suc_chua": info["tong_suc_chua"],
            "ghi_chu": info.get("ghi_chu"),
            "thoiGianTao": info["thoiGianTao"].isoformat(),
        })

    return result


@router.get("/{id_datBan}")
def get_merge_for_reservation(
    id_datBan: int,
    db: Session = Depends(get_db),
    current_admin: models.NguoiDung = Depends(get_current_staff),
):
    """Lấy thông tin ghép bàn của một đặt bàn cụ thể."""
    info = _merge_registry.get(id_datBan)
    if not info:
        raise HTTPException(status_code=404, detail="Đặt bàn này chưa được ghép bàn")

    ban_details = []
    for bid in info["ban_ids"]:
        ban = db.query(models.Ban).filter(models.Ban.id_ban == bid).first()
        if ban:
            ban_details.append({"id_ban": ban.id_ban, "tenBan": ban.tenBan, "sucChua": ban.sucChua, "viTri": ban.viTri})

    return {
        "id_datBan": id_datBan,
        "ban_ids": info["ban_ids"],
        "ban_details": ban_details,
        "tong_suc_chua": info["tong_suc_chua"],
        "ghi_chu": info.get("ghi_chu"),
        "thoiGianTao": info["thoiGianTao"].isoformat(),
    }


@router.post("/{id_datBan}")
def create_merge(
    id_datBan: int,
    req: GhepBanRequest,
    db: Session = Depends(get_db),
    current_admin: models.NguoiDung = Depends(get_current_staff),
):

    if not req.ban_ids:
        raise HTTPException(status_code=400, detail="Phải chọn ít nhất 1 bàn để ghép")

    # 1. Kiểm tra đặt bàn tồn tại
    db_datban = db.query(models.DatBan).filter(models.DatBan.id_datBan == id_datBan).first()
    if not db_datban:
        raise HTTPException(status_code=404, detail="Không tìm thấy đặt bàn")

    if db_datban.trangThai in ["Đã hủy", "Hoàn thành", "Vắng mặt"]:
        raise HTTPException(status_code=400, detail=f"Không thể ghép bàn cho đặt bàn đã ở trạng thái: {db_datban.trangThai}")

    # 2. Không cho ghép bàn 2 lần
    if id_datBan in _merge_registry:
        raise HTTPException(
            status_code=409,
            detail="Đặt bàn này đã có phiên ghép bàn. Hãy hủy ghép bàn cũ trước."
        )

    arrival = _normalize_datetime(db_datban.thoiGianDen)
    selected_tables = []
    total_capacity = 0

    for ban_id in req.ban_ids:
        ban = db.query(models.Ban).filter(models.Ban.id_ban == ban_id).first()

        # 2a. Bàn phải tồn tại
        if not ban:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy bàn #{ban_id}")

        # 2b. Bàn phải thuộc Tầng Thượng
        if not _is_rooftop(ban.viTri):
            raise HTTPException(
                status_code=400,
                detail=f"Bàn '{ban.tenBan}' không thuộc Tầng Thượng (vị trí: {ban.viTri}). Ghép bàn chỉ được phép ở Tầng Thượng."
            )

        # 2c. Bàn không bị trùng lịch (bỏ qua nếu bàn đó chính là bàn đặt gốc)
        if ban.id_ban != db_datban.id_ban:
            conflict = _find_conflicting_reservation(db, ban.id_ban, arrival)
            if conflict:
                raise HTTPException(
                    status_code=409,
                    detail=f"Bàn '{ban.tenBan}' đã có khách đặt vào khung giờ {arrival.strftime('%H:%M %d/%m/%Y')}. Vui lòng chọn bàn khác."
                )

        selected_tables.append(ban)

    # 2. Cập nhật số người mới nếu có
    if req.so_nguoi_moi is not None and req.so_nguoi_moi > 0:
        db_datban.soNguoi = req.so_nguoi_moi

    # 3. Tính tổng sức chứa các bàn đã chọn
    total_capacity = sum(b.sucChua for b in selected_tables)
    if total_capacity < db_datban.soNguoi:
        raise HTTPException(
            status_code=400,
            detail=f"Tổng sức chứa các bàn đã chọn ({total_capacity} người) không đủ cho {db_datban.soNguoi} khách. Hãy chọn thêm bàn."
        )

    # 4. Lưu vào registry
    ten_ban_list = ", ".join(b.tenBan for b in selected_tables)
    _merge_registry[id_datBan] = {
        "ban_ids": req.ban_ids,
        "tong_suc_chua": total_capacity,
        "ghi_chu": req.ghi_chu,
        "ten_ban_list": ten_ban_list,
        "thoiGianTao": datetime.now(timezone(timedelta(hours=7))).replace(tzinfo=None),
    }

    # 5. Ghi chú tự động vào DatBan.ghiChu (khach hàng thấy được)
    auto_note_parts = [f"{MARKER} Ghép bàn: {ten_ban_list}"]
    if req.ghi_chu:
        auto_note_parts.append(req.ghi_chu)
    auto_note = " | ".join(auto_note_parts)

    existing = (db_datban.ghiChu or "").strip()
    # Xóa ghép bàn cũ nếu có (trường hợp retry)
    lines = [l for l in existing.splitlines() if MARKER not in l]
    lines.append(auto_note)
    db_datban.ghiChu = "\n".join(lines).strip()

    # 6. Cập nhật trạng thái bàn → "Đã đặt" (nếu bàn đang Trống)
    for ban in selected_tables:
        if ban.trangThai == "Trống":
            ban.trangThai = "Đã đặt"

    try:
        db.commit()
        logger.info(
            "Staff %s ghép bàn thành công: đặt bàn #%s ← bàn %s (tổng %s người)",
            current_admin.id_nguoiDung, id_datBan, req.ban_ids, total_capacity
        )
    except Exception as exc:
        db.rollback()
        del _merge_registry[id_datBan]
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi lưu ghép bàn") from exc

    return {
        "message": "Ghép bàn thành công",
        "id_datBan": id_datBan,
        "ban_ids": req.ban_ids,
        "tong_suc_chua": total_capacity,
        "so_nguoi": db_datban.soNguoi,
        "ten_ban_list": ten_ban_list,
    }


@router.delete("/{id_datBan}")
def cancel_merge(
    id_datBan: int,
    db: Session = Depends(get_db),
    current_admin: models.NguoiDung = Depends(get_current_staff),
):

    info = _merge_registry.get(id_datBan)
    if not info:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên ghép bàn cho đặt bàn này")

    ban_ids = info["ban_ids"]

    # Giải phóng từng bàn nếu không còn đặt bàn active nào khác
    for ban_id in ban_ids:
        ban = db.query(models.Ban).filter(models.Ban.id_ban == ban_id).first()
        if not ban:
            continue

        active_reservations = db.query(models.DatBan).filter(
            models.DatBan.id_ban == ban_id,
            models.DatBan.id_datBan != id_datBan,
            models.DatBan.trangThai.in_(["Đã xác nhận", "Đã checkin", "Chờ xác nhận"]),
        ).count()

        active_orders = db.query(models.DonHang).filter(
            models.DonHang.id_ban == ban_id,
            models.DonHang.tinhTrang.in_(["Đang chờ món", "Đang phục vụ", "Chờ khách đến"]),
        ).count()

        if active_reservations == 0 and active_orders == 0:
            ban.trangThai = "Trống"

    # Xóa ghi chú ghép bàn khỏi DatBan.ghiChu
    db_datban = db.query(models.DatBan).filter(models.DatBan.id_datBan == id_datBan).first()
    if db_datban and db_datban.ghiChu:
        lines = [l for l in (db_datban.ghiChu or "").splitlines() if MARKER not in l]
        db_datban.ghiChu = "\n".join(lines).strip() or None

    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi hủy ghép bàn") from exc

    del _merge_registry[id_datBan]

    logger.info(
        "Admin %s hủy ghép bàn: đặt bàn #%s, đã giải phóng bàn %s",
        current_admin.id_nguoiDung, id_datBan, ban_ids
    )

    return {
        "message": "Đã hủy ghép bàn thành công",
        "id_datBan": id_datBan,
        "ban_ids_released": ban_ids,
    }
