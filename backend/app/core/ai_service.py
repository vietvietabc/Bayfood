import os
from google import genai
from google.genai import types
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.thucdon import ThucDon, DanhMuc
from app.models.datban import Ban, DatBan
from app.models.donhang import DanhGia
from app.models.giolamviec import GioLamViec
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pathlib import Path

# Đảm bảo load biến môi trường
load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

def get_restaurant_context(db: Session) -> str:
    now = datetime.utcnow() + timedelta(hours=7)  # VN time
    tomorrow = now + timedelta(days=1)

    context_parts = []

    # ===== 1. THỰC ĐƠN THEO DANH MỤC =====
    danh_mucs = db.query(DanhMuc).all()
    mon_ans = db.query(ThucDon).filter(ThucDon.trangThai == "Đang bán").all()

    # Nhóm món theo danh mục
    mon_theo_dm = {}
    mon_khong_dm = []
    for mon in mon_ans:
        if mon.id_danhMuc:
            mon_theo_dm.setdefault(mon.id_danhMuc, []).append(mon)
        else:
            mon_khong_dm.append(mon)

    dm_map = {dm.id_danhMuc: dm.tenDanhMuc for dm in danh_mucs}

    context_parts.append("═══ THỰC ĐƠN NHÀ HÀNG BAYFOOD ═══")
    if not mon_ans:
        context_parts.append("Hiện tại nhà hàng đang cập nhật thực đơn.")
    else:
        context_parts.append(f"Tổng cộng: {len(mon_ans)} món đang bán.\n")
        for dm_id, ten_dm in dm_map.items():
            mons = mon_theo_dm.get(dm_id, [])
            if mons:
                context_parts.append(f"📂 {ten_dm} ({len(mons)} món):")
                for mon in mons:
                    gia = float(mon.giaTien) if mon.giaTien else 0
                    mo_ta = f" — {mon.moTa}" if mon.moTa else ""
                    context_parts.append(f"  • {mon.tenMon}: {gia:,.0f} VNĐ{mo_ta}")
                context_parts.append("")

        if mon_khong_dm:
            context_parts.append(f"📂 Khác ({len(mon_khong_dm)} món):")
            for mon in mon_khong_dm:
                gia = float(mon.giaTien) if mon.giaTien else 0
                mo_ta = f" — {mon.moTa}" if mon.moTa else ""
                context_parts.append(f"  • {mon.tenMon}: {gia:,.0f} VNĐ{mo_ta}")
            context_parts.append("")

    # ===== 2. GIỜ LÀM VIỆC =====
    context_parts.append("═══ GIỜ LÀM VIỆC ═══")
    context_parts.append(f"Hôm nay: {now.strftime('%A, %d/%m/%Y')} — Hiện tại: {now.strftime('%H:%M')}")

    gio_hom_nay = db.query(GioLamViec).filter(GioLamViec.ngay == now.date()).first()
    gio_ngay_mai = db.query(GioLamViec).filter(GioLamViec.ngay == tomorrow.date()).first()

    if gio_hom_nay:
        if gio_hom_nay.isNghi:
            context_parts.append(f"Hôm nay: NGHỈ{' (' + gio_hom_nay.ghiChu + ')' if gio_hom_nay.ghiChu else ''}")
        else:
            context_parts.append(f"Hôm nay: Mở cửa {gio_hom_nay.gioMoCua} – {gio_hom_nay.gioDongCua}")
    else:
        context_parts.append("Hôm nay: Chưa có lịch cụ thể (mặc định 07:00–24:00)")

    if gio_ngay_mai:
        if gio_ngay_mai.isNghi:
            context_parts.append(f"Ngày mai ({tomorrow.strftime('%d/%m')}): NGHỈ{' (' + gio_ngay_mai.ghiChu + ')' if gio_ngay_mai.ghiChu else ''}")
        else:
            context_parts.append(f"Ngày mai ({tomorrow.strftime('%d/%m')}): Mở cửa {gio_ngay_mai.gioMoCua} – {gio_ngay_mai.gioDongCua}")
    else:
        context_parts.append(f"Ngày mai ({tomorrow.strftime('%d/%m')}): Chưa có lịch cụ thể (mặc định 07:00–24:00)")
    context_parts.append("")

    # ===== 3. THÔNG TIN BÀN & ĐẶT BÀN =====
    context_parts.append("═══ HỆ THỐNG BÀN ═══")
    bans = db.query(Ban).all()
    tong_so_ban = len(bans)

    if bans:
        for ban in bans:
            context_parts.append(f"  • {ban.tenBan}: {ban.sucChua} chỗ ngồi — Vị trí: {ban.viTri or 'N/A'}")
        context_parts.append("")

    # Số bàn đã đặt hôm nay / ngày mai
    dat_ban_hom_nay = db.query(func.count(DatBan.id_datBan)).filter(
        func.date(DatBan.thoiGianDen) == now.date(),
        DatBan.trangThai.notin_(["Đã hủy", "Từ chối"])
    ).scalar() or 0

    dat_ban_ngay_mai = db.query(func.count(DatBan.id_datBan)).filter(
        func.date(DatBan.thoiGianDen) == tomorrow.date(),
        DatBan.trangThai.notin_(["Đã hủy", "Từ chối"])
    ).scalar() or 0

    ban_trong_hom_nay = max(0, tong_so_ban - dat_ban_hom_nay)
    ban_trong_ngay_mai = max(0, tong_so_ban - dat_ban_ngay_mai)

    context_parts.append(f"Tổng số bàn: {tong_so_ban}")
    context_parts.append(f"Bàn trống dự kiến hôm nay: ~{ban_trong_hom_nay} bàn")
    context_parts.append(f"Bàn trống dự kiến ngày mai: ~{ban_trong_ngay_mai} bàn")
    context_parts.append("")

    # ===== 4. ĐÁNH GIÁ TỔNG THỂ =====
    context_parts.append("═══ ĐÁNH GIÁ KHÁCH HÀNG ═══")
    avg_rating = db.query(func.avg(DanhGia.soSao)).scalar()
    total_reviews = db.query(func.count(DanhGia.id_danhGia)).scalar() or 0

    if total_reviews > 0 and avg_rating:
        context_parts.append(f"Điểm trung bình: {avg_rating:.1f}/5 ⭐ ({total_reviews} đánh giá)")
    else:
        context_parts.append("Chưa có đánh giá nào.")
    context_parts.append("")

    # ===== 5. THÔNG TIN NHÀ HÀNG =====
    context_parts.append("═══ THÔNG TIN NHÀ HÀNG ═══")
    context_parts.append("Tên: BayFood Restaurant")
    context_parts.append("Trụ sở: 123 Cao Thắng, Hải Châu, Đà Nẵng")
    context_parts.append("Chi nhánh HCM: 45 Nguyễn Huệ, Quận 1")
    context_parts.append("Hotline: 1900 6868 — 0988 123 456")
    context_parts.append("Email: contact@bayfood.vn")
    context_parts.append("Website trang chủ: /")
    context_parts.append("Trang thực đơn: /menu")
    context_parts.append("Trang đặt bàn: /reservation")
    context_parts.append("Trang giỏ hàng: /cart")
    context_parts.append("Trang tài khoản cá nhân: /account")
    context_parts.append("")

    # ===== 6. HƯỚNG DẪN SỬ DỤNG WEBSITE (QUAN TRỌNG) =====
    context_parts.append("═══ HƯỚNG DẪN SỬ DỤNG WEBSITE DÀNH CHO KHÁCH ═══")
    context_parts.append("- CÁCH ĐẶT BÀN: Khách vào trang Đặt Bàn (/reservation), chọn bàn trống trên sơ đồ, chọn khung giờ trên timeline và nhập số người. Nếu bàn yêu cầu cọc, khách sẽ được chuyển tới cổng thanh toán VNPay.")
    context_parts.append("- CÁCH ĐẶT MÓN/GỌI MÓN: Khách vào trang Thực Đơn (/menu). Nếu khách đang ở nhà hàng, họ có thể quét mã QR trên bàn để tự động gắn bàn vào đơn hàng. Sau đó chọn món thêm vào giỏ hàng.")
    context_parts.append("- THANH TOÁN: Khách vào Giỏ hàng (/cart). Khách có thể chọn 'Trả trước toàn bộ' hoặc 'Đặt cọc một phần' qua cổng VNPay. Bàn chỉ được giữ sau khi thanh toán thành công.")
    context_parts.append("- TÀI KHOẢN/LỊCH SỬ: Khách vào mục Tài khoản (/account) để xem lịch sử đặt bàn, lịch sử đơn hàng, và đổi mật khẩu.")
    context_parts.append("- CHATBOT: Khách có thể dùng các nút gợi ý nhanh trong chat hoặc gõ câu hỏi để được hỗ trợ.")

    return "\n".join(context_parts)

def generate_chat_response(db: Session, chat_history: list, new_message: str) -> str:
    if not GEMINI_API_KEY:
        return "Xin lỗi, hệ thống AI Chatbot chưa được cấu hình API Key. Vui lòng liên hệ quản trị viên."
        
    restaurant_context = get_restaurant_context(db)
    
    system_instruction = f"""Bạn là trợ lý ảo AI thông minh của nhà hàng BayFood — thân thiện, chuyên nghiệp và nhiệt tình.

══ VAI TRÒ ══
- Tư vấn thực đơn, giá cả, gợi ý món ăn phù hợp
- Hỗ trợ thông tin đặt bàn, giờ mở cửa, địa chỉ
- Hướng dẫn khách hàng cách sử dụng các tính năng trên website (đặt bàn, gọi món, thanh toán)
- Trả lời câu hỏi về dịch vụ nhà hàng

══ QUY TẮC ══
1. CHỈ trả lời các câu hỏi liên quan đến nhà hàng BayFood và website BayFood. Nếu khách hỏi ngoài phạm vi, từ chối lịch sự.
2. Khi khách hỏi CÁCH làm gì đó (vd: "làm sao để đặt bàn?", "tôi muốn gọi món"), hãy dựa vào HƯỚNG DẪN SỬ DỤNG WEBSITE để chỉ dẫn từng bước ngắn gọn.
3. Trả lời ngắn gọn, rõ ràng, tối đa 3-4 câu.
4. Sử dụng emoji phù hợp (🍽️ 🔥 ⭐ 😊 👨‍🍳).
5. Khi gợi ý món ăn, luôn kèm giá tiền.
6. Format dùng **in đậm** cho tên món, giá tiền, hoặc tên các trang (vd: **Trang Đặt Bàn**).
7. Nếu khách chào, hãy chào lại và hỏi họ cần hỗ trợ gì.

══ DỮ LIỆU THỰC TẾ ══
{restaurant_context}

Hãy trả lời tự nhiên như một nhân viên tư vấn thân thiện, sử dụng dữ liệu trên để đưa ra thông tin chính xác và hướng dẫn người dùng."""

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        
        formatted_history = []
        for msg in chat_history:
            role = "user" if msg.nguoiGui == "user" else "model"
            formatted_history.append(
                types.Content(role=role, parts=[types.Part.from_text(text=msg.noiDung)])
            )
            
        chat = client.chats.create(
            model="gemini-2.5-flash",
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.4
            ),
            history=formatted_history if formatted_history else None
        )
        response = chat.send_message(new_message)
        return response.text
    except Exception as e:
        print(f"Lỗi AI: {e}")
        return "Xin lỗi, hiện tại tôi không thể kết nối tới hệ thống AI. Vui lòng thử lại sau nhé! 😊"
