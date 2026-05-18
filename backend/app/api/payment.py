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

TABLE_DEPOSIT_FEE = 50_000  # Phí giữ bàn cố định


# ========== VNPay Helpers ==========

def _hmac_sha512(secret: str, data: str) -> str:
    return hmac.new(secret.encode("utf-8"), data.encode("utf-8"), hashlib.sha512).hexdigest()


def _build_vnpay_url(amount_vnd: int, txn_ref: str, order_info: str, ip_addr: str) -> str:
    now = datetime.now()
    create_date = now.strftime("%Y%m%d%H%M%S")
    m = now.minute + 15
    h = now.hour + (m // 60)
    expire_date = now.replace(hour=h % 24, minute=m % 60).strftime("%Y%m%d%H%M%S")

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
    if body.payment_mode not in ("deposit", "full"):
        raise HTTPException(status_code=400, detail="payment_mode không hợp lệ (deposit | full)")

    # Tính tổng tiền món ăn
    tong_tien = sum(Decimal(str(item.giaTaiThoiDiemBan)) * item.soLuong for item in body.cart)
    tong_tien_float = float(tong_tien)

    # Tính số tiền cần thanh toán ngay
    if body.payment_mode == "deposit":
        so_tien = int(tong_tien_float * 0.1) + TABLE_DEPOSIT_FEE   # 10% + 50k phí giữ bàn
    else:
        so_tien = int(tong_tien_float)                              # 100% bill, không phí bàn thêm

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

    pending = models.PendingOrder(
        id_nguoiDung=current_user.id_nguoiDung,
        cart_json=cart_json,
        dat_ban_json=dat_ban_json,
        id_ban=body.id_ban,
        id_datBan=body.id_datBan,
        thoiGianDen=body.thoiGianDen,
        payment_mode=body.payment_mode,
        tong_tien=float(tong_tien),
        so_tien_thanh_toan=so_tien,
    )
    db.add(pending)
    db.commit()
    db.refresh(pending)

    # Tạo VNPay URL
    txn_ref   = f"PO{pending.id}_{int(datetime.now().timestamp())}"
    ip_addr   = http_req.client.host if http_req.client else "127.0.0.1"
    mode_label = "dat coc" if body.payment_mode == "deposit" else "thanh toan toan bo"
    order_info = f"BayFood {mode_label} don hang PO{pending.id}"

    payment_url = _build_vnpay_url(so_tien, txn_ref, order_info, ip_addr)

    # Lưu txn_ref vào pending để tra cứu sau
    pending.txn_ref = txn_ref
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
    VNPay redirect về đây sau thanh toán.
    Nếu thành công → tạo DatBan + DonHang thật → redirect frontend thành công.
    Nếu thất bại → xóa PendingOrder → redirect thất bại.
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

    # Lấy PendingOrder hoặc các đơn/đặt bàn tồn tại theo txn_ref prefix
    is_pending = txn_ref.startswith("PO")
    is_order = txn_ref.startswith("DO")
    is_reservation = txn_ref.startswith("DA")

    if response_code != "00":
        # Thanh toán thất bại → xóa pending nếu là luồng tạo mới
        if is_pending:
            pending = db.query(models.PendingOrder).filter(models.PendingOrder.txn_ref == txn_ref).first()
            if pending:
                db.delete(pending)
                db.commit()
        return RedirectResponse(
            f"{FRONTEND_URL}/payment/vnpay-return?status=failed&code={response_code}&ref={txn_ref}",
            status_code=302
        )

    # 1. Luồng Tạo mới (PendingOrder)
    if is_pending:
        pending = db.query(models.PendingOrder).filter(models.PendingOrder.txn_ref == txn_ref).first()
        if not pending:
            return RedirectResponse(
                f"{FRONTEND_URL}/payment/vnpay-return?status=pending_not_found&ref={txn_ref}",
                status_code=302
            )
        amount_paid = int(amount_raw) // 100
        try:
            result = _activate_pending_order(db, pending, amount_paid, txn_ref)
        except Exception as e:
            db.rollback()
            return RedirectResponse(
                f"{FRONTEND_URL}/payment/vnpay-return?status=db_error&ref={txn_ref}",
                status_code=302
            )
        return RedirectResponse(
            f"{FRONTEND_URL}/payment/vnpay-return"
            f"?status=success"
            f"&type={'booking' if result['has_reservation'] else 'donhang'}"
            f"&id_donHang={result['id_donHang']}"
            f"&id_datBan={result.get('id_datBan') or ''}"
            f"&id_ban={result.get('id_ban') or ''}"
            f"&amount={amount_paid}"
            f"&mode={pending.payment_mode}"
            f"&ref={txn_ref}",
            status_code=302
        )

    # 2. Luồng thanh toán đơn hàng có sẵn (DO...)
    elif is_order:
        try:
            order_id = int(txn_ref[2:].split('_')[0])
        except (ValueError, IndexError):
            return RedirectResponse(
                f"{FRONTEND_URL}/payment/vnpay-return?status=parse_error&ref={txn_ref}",
                status_code=302
            )

        order = db.query(models.DonHang).filter(models.DonHang.id_donHang == order_id).first()
        if not order:
            return RedirectResponse(
                f"{FRONTEND_URL}/payment/vnpay-return?status=pending_not_found&ref={txn_ref}",
                status_code=302
            )

        amount_paid = int(amount_raw) // 100
        order.tinhTrang = "Đã thanh toán"
        
        # Thêm lịch sử thanh toán
        db.add(models.ThanhToan(
            id_donHang=order.id_donHang,
            phuongThuc="VNPay",
            soTienThanhToan=Decimal(str(amount_paid)),
            maQR_thanhToan=txn_ref,
        ))
        db.commit()

        return RedirectResponse(
            f"{FRONTEND_URL}/payment/vnpay-return"
            f"?status=success"
            f"&type=donhang"
            f"&id_donHang={order.id_donHang}"
            f"&id_datBan={order.id_datBan or ''}"
            f"&id_ban={order.id_ban or ''}"
            f"&amount={amount_paid}"
            f"&mode=full"
            f"&ref={txn_ref}",
            status_code=302
        )

    # 3. Luồng thanh toán đặt cọc bàn có sẵn (DA...)
    elif is_reservation:
        try:
            reservation_id = int(txn_ref[2:].split('_')[0])
        except (ValueError, IndexError):
            return RedirectResponse(
                f"{FRONTEND_URL}/payment/vnpay-return?status=parse_error&ref={txn_ref}",
                status_code=302
            )

        reservation = db.query(models.DatBan).filter(models.DatBan.id_datBan == reservation_id).first()
        if not reservation:
            return RedirectResponse(
                f"{FRONTEND_URL}/payment/vnpay-return?status=pending_not_found&ref={txn_ref}",
                status_code=302
            )

        amount_paid = int(amount_raw) // 100
        reservation.trangThaiCoc = "Đã cọc"
        reservation.trangThai = "Đã xác nhận"

        # Tìm đơn hàng đi kèm nếu có để đổi trạng thái
        associated_order = db.query(models.DonHang).filter(models.DonHang.id_datBan == reservation_id).first()
        if associated_order:
            associated_order.tinhTrang = "Chờ khách đến"
            # Thêm lịch sử thanh toán cho đơn hàng
            db.add(models.ThanhToan(
                id_donHang=associated_order.id_donHang,
                phuongThuc="VNPay",
                soTienThanhToan=Decimal(str(amount_paid)),
                maQR_thanhToan=txn_ref,
            ))
        db.commit()

        return RedirectResponse(
            f"{FRONTEND_URL}/payment/vnpay-return"
            f"?status=success"
            f"&type=booking"
            f"&id_donHang={associated_order.id_donHang if associated_order else ''}"
            f"&id_datBan={reservation.id_datBan}"
            f"&id_ban={reservation.id_ban or ''}"
            f"&amount={amount_paid}"
            f"&mode=deposit"
            f"&ref={txn_ref}",
            status_code=302
        )

    else:
        return RedirectResponse(
            f"{FRONTEND_URL}/payment/vnpay-return?status=parse_error&ref={txn_ref}",
            status_code=302
        )


def _activate_pending_order(db: Session, pending: "models.PendingOrder", amount_paid: int, txn_ref: str) -> dict:
    """Tạo DatBan (nếu có) + DonHang thật từ PendingOrder đã thanh toán."""
    cart_items = json.loads(pending.cart_json)
    id_datBan  = pending.id_datBan
    id_ban     = pending.id_ban
    thoiGianDen = None
    has_reservation = False

    # --- Tạo DatBan nếu cần ---
    if pending.dat_ban_json:
        dat_ban_data = json.loads(pending.dat_ban_json)
        thoiGianDen  = datetime.fromisoformat(dat_ban_data["thoiGianDen"].replace("Z", ""))
        db_reservation = models.DatBan(
            id_ban=dat_ban_data.get("id_ban"),
            id_nguoiDung=pending.id_nguoiDung,
            thoiGianDen=thoiGianDen,
            soNguoi=dat_ban_data["soNguoi"],
            ghiChu=dat_ban_data.get("ghiChu") or "Đặt bàn kèm đơn hàng",
            trangThai="Đã xác nhận",   # Đã trả cọc → xác nhận luôn
            tienCoc=float(pending.so_tien_thanh_toan),
            trangThaiCoc="Đã cọc" if pending.payment_mode == "deposit" else "Đã cọc",
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
        # Cập nhật trạng thái đặt bàn hiện có
        existing = db.query(models.DatBan).filter(models.DatBan.id_datBan == pending.id_datBan).first()
        if existing:
            existing.trangThaiCoc = "Đã cọc"
            existing.trangThai    = "Đã xác nhận"

    # --- Tạo DonHang ---
    # Ngay cả khi thanh toán trả trước (payment_mode == "full"), đơn hàng vẫn phải trải qua luồng Chờ phục vụ/Chế biến.
    # Nếu có đặt bàn -> Chờ khách đến check-in mới kích hoạt "Đang chờ món".
    # Nếu không đặt bàn (ngồi tại bàn trực tiếp) -> Chuyển ngay sang "Đang chờ món" để bếp làm.
    tinh_trang = "Chờ khách đến"
    if not has_reservation:
        tinh_trang = "Đang chờ món"

    db_order = models.DonHang(
        id_nguoiDung=pending.id_nguoiDung,
        id_datBan=id_datBan,
        id_ban=id_ban,
        thoiGianDen=thoiGianDen,
        tinhTrang=tinh_trang,
    )
    db.add(db_order)
    db.flush()

    # --- Tạo Chi Tiết ---
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

    # --- Xóa PendingOrder ---
    db.delete(pending)
    db.commit()

    return {
        "id_donHang":    db_order.id_donHang,
        "id_datBan":     id_datBan,
        "id_ban":        id_ban,
        "has_reservation": has_reservation,
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
