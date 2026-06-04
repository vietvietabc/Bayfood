"""
VNPay Payment Integration - BayFood
Luồng: Khách chọn món + bàn → Chọn mức cọc → Thanh toán VNPay → Tạo DatBan + DonHang
"""
import hashlib
import hmac
import urllib.parse
import os
import json
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from typing import Optional, List

from app import models
from app.db.database import get_db
from app.api.auth import get_current_user

load_dotenv()

router = APIRouter(prefix="/api/payment", tags=["Thanh Toán VNPay"])

# ---- VNPay Config ----
VNPAY_TMN_CODE    = os.getenv("VNPAY_TMN_CODE",    "2QXUI1PN")
VNPAY_HASH_SECRET = os.getenv("VNPAY_HASH_SECRET", "6CTPYMRP7QEW5JHXUIUAZFPW0V9XHR7B")
VNPAY_URL         = os.getenv("VNPAY_URL",          "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html")
VNPAY_RETURN_URL  = os.getenv("VNPAY_RETURN_URL",   "http://localhost:8000/api/payment/vnpay-return")
FRONTEND_URL      = os.getenv("FRONTEND_URL",       "http://localhost:5173")

TABLE_DEPOSIT_FEE = 50_000  # Phí giữ bàn mặc định (fallback nếu bàn không có tienCocMacDinh)
MIN_ORDER_FOR_TABLE = 100_000  # Giá trị đơn tối thiểu để đặt bàn kèm món (không áp dụng QR)


# ========== VNPay Helpers ==========

def _hmac_sha512(secret: str, data: str) -> str:
    return hmac.new(secret.encode("utf-8"), data.encode("utf-8"), hashlib.sha512).hexdigest()


def _build_vnpay_url(amount_vnd: int, txn_ref: str, order_info: str, ip_addr: str) -> str:
    from datetime import timedelta, timezone
    tz_hcm = timezone(timedelta(hours=7))
    now = datetime.now(tz_hcm)
    create_date = now.strftime("%Y%m%d%H%M%S")
    expire_date = (now + timedelta(minutes=15)).strftime("%Y%m%d%H%M%S")

    params = {
        "vnp_Version":    "2.1.0",
        "vnp_Command":    "pay",
        "vnp_TmnCode":    VNPAY_TMN_CODE,
        "vnp_Amount":     str(amount_vnd * 100),
        "vnp_CurrCode":   "VND",
        "vnp_TxnRef":     txn_ref,
        "vnp_OrderInfo":  order_info,
        "vnp_OrderType":  "other",
        "vnp_Locale":     "vn",
        "vnp_ReturnUrl":  VNPAY_RETURN_URL,
        "vnp_IpAddr":     ip_addr or "127.0.0.1",
        "vnp_CreateDate": create_date,
        "vnp_ExpireDate": expire_date,
    }
    sorted_params = dict(sorted(params.items()))

    # VNPay dùng quote_plus (space→+) — phải nhất quán với chuẩn PHP urlencode của VNPay
    query_string = urllib.parse.urlencode(sorted_params)
    secure_hash  = _hmac_sha512(VNPAY_HASH_SECRET, query_string)
    return f"{VNPAY_URL}?{query_string}&vnp_SecureHash={secure_hash}"


def _verify_vnpay_signature(params: dict) -> bool:
    """Xác thực chữ ký từ VNPay — dùng cùng quote_plus như khi build URL."""
    received_hash = params.pop("vnp_SecureHash", "")
    params.pop("vnp_SecureHashType", None)
    sorted_params = dict(sorted(params.items()))
    # Re-encode với quote_plus để khớp với cách VNPay tính hash trả về
    query_string  = urllib.parse.urlencode(sorted_params)
    expected_hash = _hmac_sha512(VNPAY_HASH_SECRET, query_string)
    return received_hash.lower() == expected_hash.lower()


# ========== Request Schemas ==========

class CartItemRequest(BaseModel):
    id_monAn:          int
    soLuong:           int
    giaTaiThoiDiemBan: float

class BookingDataRequest(BaseModel):
    id_ban:     Optional[int]   = None
    thoiGianDen: str            # ISO string
    soNguoi:    int
    ghiChu:     Optional[str]   = None

class InitiateBookingPaymentRequest(BaseModel):
    """
    Khách gửi toàn bộ dữ liệu giỏ hàng + đặt bàn + mức thanh toán.
    Server tạo PendingOrder → trả VNPay URL.
    Chỉ sau khi VNPay return SUCCESS mới tạo DatBan + DonHang thật.
    """
    cart:          List[CartItemRequest]
    dat_ban:       Optional[BookingDataRequest] = None  # None = không đặt bàn
    payment_mode:  str  # "deposit" | "full"
    id_ban:        Optional[int] = None    # bàn đang ngồi trực tiếp
    id_datBan:     Optional[int] = None    # đặt bàn đã có sẵn
    thoiGianDen:   Optional[str] = None   # ISO nếu không tạo dat_ban mới


class InitiateReservationPaymentRequest(BaseModel):
    """
    Khách chỉ đặt bàn (không kèm món ăn) và cần thanh toán tiền cọc.
    Server tạo PendingOrder với cart trống → trả VNPay URL.
    Sau khi VNPay SUCCESS → chỉ tạo DatBan (không tạo DonHang).
    """
    id_ban:      int
    thoiGianDen: str        # ISO string
    soNguoi:     int
    ghiChu:      Optional[str] = None


# ========== ENDPOINTS ==========

@router.post("/initiate-booking")
def initiate_booking(
    http_req: Request,
    body: InitiateBookingPaymentRequest,
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_user),
):
    """
    Bước 1: Khách chọn đặt cọc/trả toàn bộ.
    → Lưu PendingOrder → trả URL VNPay.
    Chưa tạo DatBan / DonHang thật.
    """
    if not body.cart:
        raise HTTPException(status_code=400, detail="Giỏ hàng trống")
    if body.payment_mode not in ("đặt cọc", "toàn bộ"):
        raise HTTPException(status_code=400, detail="payment_mode không hợp lệ (đặt cọc | toàn bộ)")

    from app.api.datban import validate_restaurant_hours
    if body.dat_ban:
        dt_val = datetime.fromisoformat(body.dat_ban.thoiGianDen.replace("Z", ""))
        validate_restaurant_hours(db, dt_val, is_booking=True)
    elif body.thoiGianDen:
        dt_val = datetime.fromisoformat(body.thoiGianDen.replace("Z", ""))
        validate_restaurant_hours(db, dt_val, is_booking=False)

    # Tính tổng tiền món ăn
    tong_tien = sum(Decimal(str(item.giaTaiThoiDiemBan)) * item.soLuong for item in body.cart)
    tong_tien_float = float(tong_tien)

    # Validate ngưỡng tối thiểu khi có đặt bàn kèm món
    if body.dat_ban and tong_tien_float < MIN_ORDER_FOR_TABLE:
        raise HTTPException(
            status_code=400,
            detail=f"Đơn hàng cần tối thiểu {MIN_ORDER_FOR_TABLE:,} VNĐ để đặt bàn kèm món. Vui lòng thêm món vào giỏ hàng.".replace(',', '.')
        )

    # Lấy phí giữ bàn thực tế của bàn đã chọn (fallback = TABLE_DEPOSIT_FEE)
    table_fee = TABLE_DEPOSIT_FEE
    if body.dat_ban and body.dat_ban.id_ban:
        db_ban = db.query(models.Ban).filter(models.Ban.id_ban == body.dat_ban.id_ban).first()
        if db_ban and db_ban.tienCocMacDinh and float(db_ban.tienCocMacDinh) > 0:
            table_fee = int(db_ban.tienCocMacDinh)

    # Tính số tiền cần thanh toán ngay
    if body.payment_mode == "đặt cọc":
        so_tien = int(tong_tien_float * 0.1) + table_fee   # 10% bill + phí giữ bàn
    else:
        so_tien = int(tong_tien_float)                      # 100% bill, không phí bàn thêm

    # Serialize dữ liệu cart + booking vào PendingOrder
    cart_json = json.dumps([
        {"id_monAn": i.id_monAn, "soLuong": i.soLuong, "giaTaiThoiDiemBan": float(i.giaTaiThoiDiemBan)}
        for i in body.cart
    ], ensure_ascii=False)

    dat_ban_json = None
    if body.dat_ban:
        dat_ban_json = json.dumps({
            "id_ban":      body.dat_ban.id_ban,
            "thoiGianDen": body.dat_ban.thoiGianDen,
            "soNguoi":     body.dat_ban.soNguoi,
            "ghiChu":      body.dat_ban.ghiChu,
        }, ensure_ascii=False)

    pending = models.DonHangChoThanhToan(
        id_nguoiDung=current_user.id_nguoiDung,
        gioHang_json=cart_json,
        datBan_json=dat_ban_json,
        id_ban=body.id_ban,
        id_datBan=body.id_datBan,
        thoiGianDen=body.thoiGianDen,
        hinhThucThanhToan=body.payment_mode,
        tongTien=float(tong_tien),
        soTienThanhToan=so_tien,
    )
    db.add(pending)
    db.commit()
    db.refresh(pending)

    # Tạo VNPay URL
    txn_ref   = f"PO{pending.id}_{int(datetime.now().timestamp())}"
    ip_addr   = http_req.client.host if http_req.client else "127.0.0.1"
    mode_label = "dat coc" if body.payment_mode == "đặt cọc" else "thanh toan toan bo"
    order_info = f"BayFood {mode_label} don hang PO{pending.id}"

    payment_url = _build_vnpay_url(so_tien, txn_ref, order_info, ip_addr)

    # Lưu txn_ref vào pending để tra cứu sau
    pending.maGiaoDich = txn_ref
    db.commit()

    return {
        "paymentUrl":   payment_url,
        "pendingId":    pending.id,
        "txnRef":       txn_ref,
        "soTien":       so_tien,
        "paymentMode":  body.payment_mode,
        "tongTien":     float(tong_tien),
    }


@router.get("/vnpay-return")
def vnpay_return(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    VNPay redirect về đây sau thanh toán (Luồng đồng bộ qua Browser).
    """
    params        = dict(request.query_params)
    response_code = params.get("vnp_ResponseCode", "")
    txn_ref       = params.get("vnp_TxnRef", "")
    amount_raw    = params.get("vnp_Amount", "0")

    # Xác thực chữ ký
    params_copy = dict(params)
    is_valid = _verify_vnpay_signature(params_copy)
    if not is_valid:
        return RedirectResponse(
            f"{FRONTEND_URL}/payment/vnpay-return?status=invalid_signature&ref={txn_ref}",
            status_code=302
        )

    if response_code != "00":
        # Thanh toán thất bại → xóa pending nếu là luồng tạo mới
        if txn_ref.startswith("PO"):
            pending = db.query(models.DonHangChoThanhToan).filter(models.DonHangChoThanhToan.maGiaoDich == txn_ref).first()
            if pending:
                pending.trangThai = "Thất bại"
                db.commit()
        return RedirectResponse(
            f"{FRONTEND_URL}/payment/vnpay-return?status=failed&code={response_code}&ref={txn_ref}",
            status_code=302
        )

    # Xử lý thành công
    try:
        result = _process_payment_success(db, txn_ref, amount_raw)
        if result["status"] == "success":
            # Redirect về frontend với đầy đủ params thành công
            query = f"?status=success&ref={txn_ref}&amount={result['amount_paid']}"
            if "id_donHang" in result: query += f"&id_donHang={result['id_donHang']}"
            if "id_datBan" in result: query += f"&id_datBan={result['id_datBan']}"
            if "id_ban" in result: query += f"&id_ban={result['id_ban']}"
            if "type" in result: query += f"&type={result['type']}"
            if "mode" in result: query += f"&mode={result['mode']}"
            
            return RedirectResponse(f"{FRONTEND_URL}/payment/vnpay-return{query}", status_code=302)
        else:
            return RedirectResponse(f"{FRONTEND_URL}/payment/vnpay-return?status={result['status']}&ref={txn_ref}", status_code=302)
    except Exception as e:
        print(f"Error in vnpay_return: {e}")
        db.rollback()
        return RedirectResponse(f"{FRONTEND_URL}/payment/vnpay-return?status=db_error&ref={txn_ref}", status_code=302)


@router.get("/vnpay-ipn")
def vnpay_ipn(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    VNPay gọi trực tiếp server-to-server (IPN).
    Phải trả về JSON theo chuẩn VNPay.
    """
    params = dict(request.query_params)
    params_copy = dict(params)
    txn_ref = params.get("vnp_TxnRef", "")
    response_code = params.get("vnp_ResponseCode", "")
    amount_raw = params.get("vnp_Amount", "0")

    # 1. Kiểm tra chữ ký
    if not _verify_vnpay_signature(params_copy):
        return {"RspCode": "97", "Message": "Invalid signature"}

    try:
        # 2. Xử lý logic nghiệp vụ
        if response_code == "00":
            _process_payment_success(db, txn_ref, amount_raw)
        else:
            # Giao dịch thất bại -> Xóa pending nếu có
            if txn_ref.startswith("PO"):
                pending = db.query(models.DonHangChoThanhToan).filter(models.DonHangChoThanhToan.maGiaoDich == txn_ref).first()
                if pending:
                    pending.trangThai = "Thất bại"
                    db.commit()

        return {"RspCode": "00", "Message": "Confirm Success"}
    except Exception as e:
        print(f"IPN Error: {e}")
        return {"RspCode": "99", "Message": "Unknown error"}


def _process_payment_success(db: Session, txn_ref: str, amount_raw: str) -> dict:
    """Hàm dùng chung để xử lý khi VNPay báo thành công (cả Return và IPN)."""
    amount_paid = int(amount_raw) // 100

    is_pending     = txn_ref.startswith("PO")
    is_order       = txn_ref.startswith("DO")
    is_reservation = txn_ref.startswith("DA")
    is_order_edit  = txn_ref.startswith("OE")

    # 1. Luồng Tạo mới (DonHangChoThanhToan)
    if is_pending:
        pending = db.query(models.DonHangChoThanhToan).filter(models.DonHangChoThanhToan.maGiaoDich == txn_ref).first()
        if not pending:
            return {"status": "pending_not_found"}
        
        result = _activate_pending_order(db, pending, amount_paid, txn_ref)
        return {
            "status": "success",
            "amount_paid": amount_paid,
            "type": "booking" if result["has_reservation"] else "donhang",
            "id_donHang": result["id_donHang"],
            "id_datBan": result.get("id_datBan"),
            "id_ban": result.get("id_ban"),
            "mode": pending.hinhThucThanhToan
        }

    # 2. Luồng thanh toán đơn hàng có sẵn (DO...)
    elif is_order:
        try:
            order_id = int(txn_ref[2:].split('_')[0])
        except (ValueError, IndexError):
            return {"status": "parse_error"}

        order = db.query(models.DonHang).filter(models.DonHang.id_donHang == order_id).first()
        if not order:
            return {"status": "pending_not_found"}

        # Tránh xử lý trùng (Idempotency)
        existing_pay = db.query(models.ThanhToan).filter(models.ThanhToan.maQR_thanhToan == txn_ref).first()
        if not existing_pay:
            order.tinhTrang = "Đã thanh toán"
            db.add(models.ThanhToan(
                id_donHang=order.id_donHang,
                phuongThuc="VNPay",
                soTienThanhToan=Decimal(str(amount_paid)),
                maQR_thanhToan=txn_ref,
            ))
            db.commit()

        return {
            "status": "success",
            "amount_paid": amount_paid,
            "type": "donhang",
            "id_donHang": order.id_donHang,
            "id_datBan": order.id_datBan,
            "id_ban": order.id_ban,
            "mode": "toàn bộ"
        }

    # 3. Luồng thanh toán đặt cọc bàn có sẵn (DA...)
    elif is_reservation:
        try:
            reservation_id = int(txn_ref[2:].split('_')[0])
        except (ValueError, IndexError):
            return {"status": "parse_error"}

        reservation = db.query(models.DatBan).filter(models.DatBan.id_datBan == reservation_id).first()
        if not reservation:
            return {"status": "pending_not_found"}

        # Tránh xử lý trùng
        if reservation.trangThaiCoc != "Đã cọc":
            reservation.trangThaiCoc = "Đã cọc"
            reservation.trangThai = "Đã xác nhận"

            associated_order = db.query(models.DonHang).filter(models.DonHang.id_datBan == reservation_id).first()
            if associated_order:
                associated_order.tinhTrang = "Chờ khách đến"
                db.add(models.ThanhToan(
                    id_donHang=associated_order.id_donHang,
                    phuongThuc="VNPay",
                    soTienThanhToan=Decimal(str(amount_paid)),
                    maQR_thanhToan=txn_ref,
                ))
            db.commit()

        associated_order = db.query(models.DonHang).filter(models.DonHang.id_datBan == reservation_id).first()
        return {
            "status": "success",
            "amount_paid": amount_paid,
            "type": "booking",
            "id_donHang": associated_order.id_donHang if associated_order else None,
            "id_datBan": reservation.id_datBan,
            "id_ban": reservation.id_ban,
            "mode": "đặt cọc"
        }

    elif is_order_edit:
        try:
            edit_id = int(txn_ref[2:].split('_')[0])
        except (ValueError, IndexError):
            return {"status": "parse_error"}

        pending_edit = db.query(models.ChinhSuaDonHangChoThanhToan).filter(
            models.ChinhSuaDonHangChoThanhToan.id == edit_id
        ).first()
        if not pending_edit:
            return {"status": "pending_not_found"}

        # Tránh xử lý trùng (idempotency)
        existing_pay = db.query(models.ThanhToan).filter(
            models.ThanhToan.maQR_thanhToan == txn_ref
        ).first()
        if not existing_pay:
            import json
            new_items = json.loads(pending_edit.gioHangMoi_json)
            supplement_mode = f"bổ sung_{pending_edit.hinhThucThanhToan or 'đặt cọc'}"

            # Xoa chi tiet cu va them chi tiet moi
            db.query(models.ChiTietDonHang).filter(
                models.ChiTietDonHang.id_donHang == pending_edit.id_donHang
            ).delete()
            for item in new_items:
                db.add(models.ChiTietDonHang(
                    id_donHang=pending_edit.id_donHang,
                    id_monAn=item["id_monAn"],
                    soLuong=item["soLuong"],
                    giaTaiThoiDiemBan=Decimal(str(item["giaTaiThoiDiemBan"])),
                    trangThaiMon="Chờ chế biến",
                ))

            # Ghi nhan thanh toan bo sung
            db.add(models.ThanhToan(
                id_donHang=pending_edit.id_donHang,
                phuongThuc="VNPay",
                soTienThanhToan=Decimal(str(amount_paid)),
                maQR_thanhToan=txn_ref,
            ))

            order = db.query(models.DonHang).filter(
                models.DonHang.id_donHang == pending_edit.id_donHang
            ).first()
            id_ban = order.id_ban if order else None
            id_datBan = order.id_datBan if order else None

            pending_edit.trangThai = "Thành công"
            db.commit()

            return {
                "status": "success",
                "amount_paid": amount_paid,
                "type": "order_edit",
                "id_donHang": pending_edit.id_donHang,
                "id_datBan": id_datBan,
                "id_ban": id_ban,
                "mode": supplement_mode,
            }

        return {
            "status": "success",
            "amount_paid": amount_paid,
            "type": "order_edit",
            "id_donHang": pending_edit.id_donHang,
            "mode": f"bổ sung_{pending_edit.hinhThucThanhToan or 'đặt cọc'}",
        }

    return {"status": "parse_error"}


def _activate_pending_order(db: Session, pending: "models.DonHangChoThanhToan", amount_paid: int, txn_ref: str) -> dict:
    """Tạo DatBan (nếu có) + DonHang thật từ DonHangChoThanhToan đã thanh toán."""
    cart_items = json.loads(pending.gioHang_json)  # Có thể là [] nếu chỉ đặt bàn
    id_datBan  = pending.id_datBan
    id_ban     = pending.id_ban
    thoiGianDen = None
    has_reservation = False
    is_reservation_only = (len(cart_items) == 0)  # Đặt bàn thuần, không kèm món

    # --- Tạo DatBan nếu cần ---
    if pending.datBan_json:
        dat_ban_data = json.loads(pending.datBan_json)
        thoiGianDen  = datetime.fromisoformat(dat_ban_data["thoiGianDen"].replace("Z", ""))
        ghiChu_default = "Đặt bàn" if is_reservation_only else "Đặt bàn kèm đơn hàng"
        db_reservation = models.DatBan(
            id_ban=dat_ban_data.get("id_ban"),
            id_nguoiDung=pending.id_nguoiDung,
            thoiGianDen=thoiGianDen,
            soNguoi=dat_ban_data["soNguoi"],
            ghiChu=dat_ban_data.get("ghiChu") or ghiChu_default,
            trangThai="Đã xác nhận",   # Đã trả cọc → xác nhận luôn
            tienCoc=float(pending.soTienThanhToan),
            trangThaiCoc="Đã cọc",
        )
        db.add(db_reservation)
        db.flush()
        id_datBan = db_reservation.id_datBan
        id_ban    = db_reservation.id_ban
        has_reservation = True
    elif pending.thoiGianDen:
        thoiGianDen = datetime.fromisoformat(pending.thoiGianDen.replace("Z", ""))
        has_reservation = True
    elif pending.id_datBan:
        has_reservation = True
        existing = db.query(models.DatBan).filter(models.DatBan.id_datBan == pending.id_datBan).first()
        if existing:
            existing.trangThaiCoc = "Đã cọc"
            existing.trangThai    = "Đã xác nhận"

    # --- Nếu chỉ đặt bàn (cart rỗng) → không tạo DonHang ---
    if is_reservation_only:
        pending.trangThai = "Thành công"
        db.commit()
        return {
            "id_donHang":      None,
            "id_datBan":       id_datBan,
            "id_ban":          id_ban,
            "has_reservation": True,
        }

    # --- Tạo DonHang (chỉ khi có món ăn) ---
    tinh_trang = "Chờ khách đến" if has_reservation else "Đang chờ món"

    db_order = models.DonHang(
        id_nguoiDung=pending.id_nguoiDung,
        id_datBan=id_datBan,
        id_ban=id_ban,
        thoiGianDen=thoiGianDen,
        tinhTrang=tinh_trang,
    )
    db.add(db_order)
    db.flush()

    # --- Tạo Chi Tiết Món ---
    for item in cart_items:
        db.add(models.ChiTietDonHang(
            id_donHang=db_order.id_donHang,
            id_monAn=item["id_monAn"],
            soLuong=item["soLuong"],
            giaTaiThoiDiemBan=Decimal(str(item["giaTaiThoiDiemBan"])),
            trangThaiMon="Chờ chế biến",
        ))

    # --- Ghi nhận ThanhToan ---
    db.add(models.ThanhToan(
        id_donHang=db_order.id_donHang,
        phuongThuc="VNPay",
        soTienThanhToan=Decimal(str(amount_paid)),
        maQR_thanhToan=txn_ref,
    ))

    pending.trangThai = "Thành công"
    db.commit()

    return {
        "id_donHang":      db_order.id_donHang,
        "id_datBan":       id_datBan,
        "id_ban":          id_ban,
        "has_reservation": has_reservation,
    }


# ========== Thanh toán cọc đặt bàn (không kèm món) ==========

@router.post("/initiate-reservation")
def initiate_reservation_payment(
    http_req: Request,
    body: InitiateReservationPaymentRequest,
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_user),
):
    """
    Khách đặt bàn thuần (không kèm giỏ hàng món ăn).
    Lấy tienCocMacDinh của bàn → tạo PendingOrder với cart=[] → trả VNPay URL.
    Sau khi VNPay SUCCESS → chỉ tạo DatBan (trạng thái Đã xác nhận), không tạo DonHang.
    """
    # Kiểm tra bàn tồn tại và lấy tiền cọc
    db_ban = db.query(models.Ban).filter(models.Ban.id_ban == body.id_ban).first()
    if not db_ban:
        raise HTTPException(status_code=404, detail="Không tìm thấy bàn")

    tien_coc = float(db_ban.tienCocMacDinh or 0)
    if tien_coc <= 0:
        raise HTTPException(
            status_code=400,
            detail="Bàn này không yêu cầu đặt cọc. Vui lòng dùng luồng đặt bàn thông thường."
        )

    # Validate giờ mở cửa
    from app.api.datban import validate_restaurant_hours
    dt_val = datetime.fromisoformat(body.thoiGianDen.replace("Z", ""))
    validate_restaurant_hours(db, dt_val, is_booking=True)

    # Tạo PendingOrder với cart rỗng
    dat_ban_json = json.dumps({
        "id_ban":      body.id_ban,
        "thoiGianDen": body.thoiGianDen,
        "soNguoi":     body.soNguoi,
        "ghiChu":      body.ghiChu,
    }, ensure_ascii=False)

    pending = models.DonHangChoThanhToan(
        id_nguoiDung=current_user.id_nguoiDung,
        gioHang_json="[]",          # Không có món ăn
        datBan_json=dat_ban_json,
        id_ban=None,
        id_datBan=None,
        thoiGianDen=None,
        hinhThucThanhToan="đặt cọc",
        tongTien=tien_coc,
        soTienThanhToan=int(tien_coc),
    )
    db.add(pending)
    db.commit()
    db.refresh(pending)

    txn_ref    = f"PO{pending.id}_{int(datetime.now().timestamp())}"
    ip_addr    = http_req.client.host if http_req.client else "127.0.0.1"
    order_info = f"BayFood dat coc ban {body.id_ban} - {int(tien_coc)}VND"
    payment_url = _build_vnpay_url(int(tien_coc), txn_ref, order_info, ip_addr)

    pending.maGiaoDich = txn_ref
    db.commit()

    return {
        "paymentUrl": payment_url,
        "pendingId":  pending.id,
        "txnRef":     txn_ref,
        "soTien":     int(tien_coc),
        "tenBan":     db_ban.tenBan,
    }


# ========== Thanh toán bổ sung (đơn hàng đã tồn tại) ==========

class PaymentCreateRequest(BaseModel):
    payment_type: str   # "donhang" | "datban"
    target_id:    int
    amount:       float

@router.post("/create-vnpay-url")
def create_vnpay_url(
    req: Request,
    body: PaymentCreateRequest,
    db: Session = Depends(get_db),
    current_user: models.NguoiDung = Depends(get_current_user),
):
    """Tạo URL thanh toán cho đơn hàng / đặt bàn đã tồn tại."""
    amount_to_pay = body.amount

    if body.payment_type == "donhang":
        target = db.query(models.DonHang).filter(models.DonHang.id_donHang == body.target_id).first()
        if not target:
            raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
        
        # Tính tổng giá trị đơn hàng thực tế
        chi_tiets = db.query(models.ChiTietDonHang).filter(models.ChiTietDonHang.id_donHang == target.id_donHang).all()
        order_total = sum(ct.giaTaiThoiDiemBan * ct.soLuong for ct in chi_tiets)
        
        # Kiểm tra xem đơn hàng này có bàn đi kèm và bàn đã được thanh toán cọc hay chưa
        deposit_amount = 0.0
        if target.id_datBan:
            reservation = db.query(models.DatBan).filter(models.DatBan.id_datBan == target.id_datBan).first()
            if reservation and reservation.trangThaiCoc == "Đã cọc" and reservation.tienCoc:
                deposit_amount = float(reservation.tienCoc)
        
        # Số tiền thực trả còn lại = Tổng hóa đơn món ăn - Tiền cọc đã trả
        amount_to_pay = float(order_total) - deposit_amount
        if amount_to_pay < 0:
            amount_to_pay = 0.0
            
        order_info = f"BayFood thanh toan phan con lai don hang #{body.target_id}"

    elif body.payment_type == "datban":
        target = db.query(models.DatBan).filter(models.DatBan.id_datBan == body.target_id).first()
        if not target:
            raise HTTPException(status_code=404, detail="Không tìm thấy đặt bàn")
        amount_to_pay = float(target.tienCoc) if target.tienCoc else body.amount
        order_info = f"BayFood dat coc giu cho #{body.target_id}"
    else:
        raise HTTPException(status_code=400, detail="payment_type không hợp lệ")

    txn_ref     = f"{body.payment_type[:2].upper()}{body.target_id}_{int(datetime.now().timestamp())}"
    ip_addr     = req.client.host if req.client else "127.0.0.1"
    payment_url = _build_vnpay_url(int(amount_to_pay), txn_ref, order_info, ip_addr)
    return {"paymentUrl": payment_url, "txnRef": txn_ref}
