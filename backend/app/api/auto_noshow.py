"""
auto_noshow.py
==============
Engine tự động xử lý các đặt bàn / đơn hàng quá hạn mà khách không đến.

Ngưỡng: 3 giờ 15 phút (195 phút) sau thoiGianDen

Quy tắc:
  A. DatBan.trangThai in ["Chờ xác nhận", "Đã đặt"]  → Tự động "Đã hủy"
  B. DatBan.trangThai == "Đã xác nhận"               → Tự động "Vắng mặt" + Mất cọc (nếu có)
  C. DonHang.tinhTrang == "Chờ khách đến"
     + id_datBan IS NULL (không có đặt bàn)
     + thoiGianDen quá 3h15m                         → Tự động "Vắng mặt"

Trigger: được gọi ở đầu các endpoint GET của datban (all/list, /me).
"""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app import models
from app.api.thongbao import create_notification

logger = logging.getLogger(__name__)

# ── Cấu hình ngưỡng thời gian ────────────────────────────────────────────────
AUTO_NOSHOW_THRESHOLD = timedelta(hours=3, minutes=15)

# Trạng thái đặt bàn chưa check-in mà cần xử lý
PENDING_STATUSES = ["Chờ xác nhận", "Đã đặt"]   # → Hủy
CONFIRMED_STATUS = "Đã xác nhận"                 # → Vắng mặt


def _now_vn() -> datetime:
    """Trả về giờ Việt Nam (GMT+7) dạng naive datetime."""
    return datetime.now(timezone(timedelta(hours=7))).replace(
        tzinfo=None, second=0, microsecond=0
    )


def _free_table(db: Session, id_ban: int | None) -> None:
    """Giải phóng bàn về trạng thái Trống nếu có."""
    if id_ban is None:
        return
    db_ban = db.query(models.Ban).filter(models.Ban.id_ban == id_ban).first()
    if db_ban and db_ban.trangThai != "Trống":
        db_ban.trangThai = "Trống"


def _mark_orders_noshow(db: Session, id_datBan: int) -> None:
    """Chuyển các đơn hàng 'Chờ khách đến' liên quan sang 'Vắng mặt'."""
    db.query(models.DonHang).filter(
        models.DonHang.id_datBan == id_datBan,
        models.DonHang.tinhTrang == "Chờ khách đến",
    ).update({"tinhTrang": "Vắng mặt"}, synchronize_session=False)


def _send_noshow_notification(
    db: Session,
    id_nguoiDung: int,
    id_datBan: int,
    is_cancelled: bool,
    deposit_info: str,
) -> None:
    """Gửi thông báo đến khách về đặt bàn bị hủy hoặc vắng mặt tự động."""
    if is_cancelled:
        tieu_de = "Đặt bàn đã tự động bị hủy"
        noi_dung = (
            f"Đặt bàn #{id_datBan} đã tự động bị hủy do Admin chưa xác nhận "
            f"sau 3 giờ 15 phút. Vui lòng đặt lại hoặc liên hệ nhà hàng."
        )
    else:
        tieu_de = "Thông báo vắng mặt tự động"
        noi_dung = (
            f"Đặt bàn #{id_datBan} đã được hệ thống tự động đánh dấu Vắng mặt "
            f"vì bạn không đến sau 3 giờ 15 phút.{deposit_info}"
        )

    try:
        create_notification(
            db,
            id_nguoiDung=id_nguoiDung,
            tieuDe=tieu_de,
            noiDung=noi_dung,
            lienKet="/account",
        )
        # Thông báo thêm tới Quản lý
        create_notification(
            db,
            vaiTroNhan="Quản lý",
            tieuDe=tieu_de,
            noiDung=f"[Tự động] {noi_dung}",
            lienKet="/admin/reservations",
        )
    except Exception as e:
        logger.warning("Không gửi được thông báo auto no-show cho datban #%s: %s", id_datBan, e)


def auto_mark_no_show(db: Session) -> int:
    """
    Quét và tự động xử lý các đặt bàn quá hạn chưa check-in.

    - trangThai in ["Chờ xác nhận", "Đã đặt"] → "Đã hủy"
    - trangThai == "Đã xác nhận"              → "Vắng mặt" + mất cọc

    Trả về số lượng đặt bàn đã được xử lý.
    """
    now = _now_vn()
    cutoff = now - AUTO_NOSHOW_THRESHOLD

    # Tìm tất cả đặt bàn chưa check-in đã quá ngưỡng thời gian
    overdue = (
        db.query(models.DatBan)
        .filter(
            models.DatBan.thoiGianDen <= cutoff,
            models.DatBan.trangThai.in_(
                PENDING_STATUSES + [CONFIRMED_STATUS]
            ),
        )
        .all()
    )

    count = 0

    for res in overdue:
        try:
            is_cancelled = res.trangThai in PENDING_STATUSES

            if is_cancelled:
                # ── Trường hợp A: Chờ xác nhận / Đã đặt → Tự động Hủy ──
                res.trangThai = "Đã hủy"
                res.lyDoHuy = "Tự động hủy: Admin chưa xác nhận sau 3 giờ 15 phút"
                _free_table(db, res.id_ban)
                _mark_orders_noshow(db, res.id_datBan)
                _send_noshow_notification(
                    db,
                    id_nguoiDung=res.id_nguoiDung,
                    id_datBan=res.id_datBan,
                    is_cancelled=True,
                    deposit_info="",
                )
                logger.info(
                    "[AutoNoShow] Đặt bàn #%s → Đã hủy (Chờ xác nhận quá 3h15m)",
                    res.id_datBan,
                )

            else:
                # ── Trường hợp B: Đã xác nhận → Tự động Vắng mặt ──
                res.trangThai = "Vắng mặt"
                res.lyDoHuy = "Tự động vắng mặt: Khách không đến sau 3 giờ 15 phút"

                # Xử lý tiền cọc
                deposit_info = ""
                tien_coc = getattr(res, 'tienCoc', None) or 0
                if tien_coc > 0:
                    res.trangThaiCoc = "Mất cọc"
                    so_tien = f"{int(tien_coc):,}".replace(",", ".") + " VNĐ"
                    deposit_info = f" Tiền cọc {so_tien} đã bị mất do không đến đúng giờ."

                _free_table(db, res.id_ban)
                _mark_orders_noshow(db, res.id_datBan)
                _send_noshow_notification(
                    db,
                    id_nguoiDung=res.id_nguoiDung,
                    id_datBan=res.id_datBan,
                    is_cancelled=False,
                    deposit_info=deposit_info,
                )
                logger.info(
                    "[AutoNoShow] Đặt bàn #%s → Vắng mặt (Đã xác nhận quá 3h15m)%s",
                    res.id_datBan,
                    f" | Mất cọc {tien_coc}" if tien_coc else "",
                )

            count += 1

        except Exception as e:
            logger.error(
                "[AutoNoShow] Lỗi khi xử lý đặt bàn #%s: %s",
                res.id_datBan,
                str(e),
            )

    # ── Trường hợp C: Đơn hàng không có đặt bàn, có thoiGianDen, quá 3h15m ──
    count += _auto_mark_standalone_orders_no_show(db, cutoff)

    if count > 0:
        try:
            db.commit()
            logger.info("[AutoNoShow] Đã xử lý %s bản ghi quá hạn.", count)
        except Exception as e:
            db.rollback()
            logger.error("[AutoNoShow] Lỗi commit: %s", str(e))
            return 0

    return count


def _auto_mark_standalone_orders_no_show(db: Session, cutoff: datetime) -> int:
    """
    Trường hợp C: Đơn hàng đặt trực tiếp (không có đặt bàn),
    có thoiGianDen đã quá 3h15m mà vẫn đang ở trạng thái 'Chờ khách đến'.
    → Tự động chuyển sang 'Vắng mặt'.
    """
    overdue_orders = (
        db.query(models.DonHang)
        .filter(
            models.DonHang.tinhTrang == "Chờ khách đến",
            models.DonHang.id_datBan.is_(None),      # Không có đặt bàn
            models.DonHang.thoiGianDen.isnot(None),  # Có thời gian hẹn
            models.DonHang.thoiGianDen <= cutoff,    # Đã quá ngưỡng
        )
        .all()
    )

    count = 0
    for order in overdue_orders:
        try:
            order.tinhTrang = "Vắng mặt"
            logger.info(
                "[AutoNoShow] Đơn hàng #%s → Vắng mặt (không có đặt bàn, quá 3h15m)",
                order.id_donHang,
            )

            # Thông báo cho khách
            try:
                create_notification(
                    db,
                    id_nguoiDung=order.id_nguoiDung,
                    tieuDe="Đơn hàng đã tự động vắng mặt",
                    noiDung=(
                        f"Đơn hàng #{order.id_donHang} đã được hệ thống tự động đánh dấu "
                        f"Vắng mặt vì bạn không đến sau 3 giờ 15 phút."
                    ),
                    lienKet="/account",
                )
                # Thông báo Quản lý
                create_notification(
                    db,
                    vaiTroNhan="Quản lý",
                    tieuDe="[Tự động] Đơn hàng vắng mặt",
                    noiDung=(
                        f"Đơn hàng #{order.id_donHang} (khách #{order.id_nguoiDung}) "
                        f"đã tự động chuyển sang Vắng mặt do quá 3h15m chưa đến."
                    ),
                    lienKet="/admin/orders",
                )
            except Exception as e:
                logger.warning(
                    "[AutoNoShow] Không gửi được thông báo cho đơn #%s: %s",
                    order.id_donHang, e,
                )

            count += 1

        except Exception as e:
            logger.error(
                "[AutoNoShow] Lỗi khi xử lý đơn hàng #%s: %s",
                order.id_donHang,
                str(e),
            )

    return count

