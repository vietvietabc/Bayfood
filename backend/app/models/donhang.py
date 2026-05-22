from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Numeric, Text, CheckConstraint
from datetime import datetime, timedelta
from app.db.database import Base

def get_vn_time():
    return datetime.utcnow() + timedelta(hours=7)

class DonHang(Base):
    __tablename__ = "DONHANG"
    id_donHang = Column(Integer, primary_key=True, index=True)
    id_nguoiDung = Column(Integer, ForeignKey("NGUOIDUNG.id_nguoiDung", ondelete="CASCADE"), nullable=False)
    id_datBan = Column(Integer, ForeignKey("DATBAN.id_datBan", ondelete="SET NULL"), nullable=True)
    id_nhanVien = Column(Integer, ForeignKey("NHANVIEN.id_nhanVien", ondelete="SET NULL"), nullable=True)
    id_ban = Column(Integer, ForeignKey("BAN.id_ban", ondelete="SET NULL"), nullable=True)
    thoiGianTao = Column(DateTime, default=get_vn_time, nullable=False)
    thoiGianDen = Column(DateTime, nullable=True)
    tinhTrang = Column(String(50), default="Đang chờ món", nullable=False)
    thoiGianHoanThanh = Column(DateTime, nullable=True)

class ChiTietDonHang(Base):
    __tablename__ = "CHITIETDONHANG"
    id_chiTietDonHang = Column(Integer, primary_key=True, index=True)
    id_donHang = Column(Integer, ForeignKey("DONHANG.id_donHang", ondelete="CASCADE"), nullable=False)
    id_monAn = Column(Integer, ForeignKey("THUCDON.id_monAn", ondelete="CASCADE"), nullable=False)
    id_nhanVien = Column(Integer, ForeignKey("NHANVIEN.id_nhanVien", ondelete="SET NULL"), nullable=True) # Bếp nhận nấu
    soLuong = Column(Integer, CheckConstraint('soLuong > 0'), nullable=False)
    giaTaiThoiDiemBan = Column(Numeric(10, 2), CheckConstraint('giaTaiThoiDiemBan >= 0'), nullable=False)
    trangThaiMon = Column(String(50), default="Chờ chế biến", nullable=False)

class ThanhToan(Base):
    __tablename__ = "THANHTOAN"
    id_thanhToan = Column(Integer, primary_key=True, index=True)
    id_donHang = Column(Integer, ForeignKey("DONHANG.id_donHang", ondelete="CASCADE"), nullable=False)
    phuongThuc = Column(String(50), nullable=False)
    soTienThanhToan = Column(Numeric(10, 2), CheckConstraint('soTienThanhToan >= 0'), nullable=False)
    thoiGianGiaoDich = Column(DateTime, default=get_vn_time, nullable=False)
    maQR_thanhToan = Column(String(255), nullable=True)

class DanhGia(Base):
    __tablename__ = "DANHGIA"
    id_danhGia = Column(Integer, primary_key=True, index=True)
    id_nguoiDung = Column(Integer, ForeignKey("NGUOIDUNG.id_nguoiDung", ondelete="CASCADE"), nullable=False)
    id_donHang = Column(Integer, ForeignKey("DONHANG.id_donHang", ondelete="CASCADE"), nullable=False)
    soSao = Column(Integer, CheckConstraint('soSao >= 1 AND soSao <= 5'), nullable=False)
    noiDung = Column(Text, nullable=True)


class PendingOrder(Base):
    """
    Lưu trữ tạm dữ liệu giỏ hàng + đặt bàn của khách.
    Chỉ tồn tại đến khi VNPay trả về SUCCESS → chuyển thành DatBan + DonHang thật rồi bị xóa.
    Nếu thất bại → xóa luôn.
    """
    __tablename__ = "PENDING_ORDER"
    id               = Column(Integer, primary_key=True, index=True)
    id_nguoiDung     = Column(Integer, ForeignKey("NGUOIDUNG.id_nguoiDung", ondelete="CASCADE"), nullable=False)
    cart_json        = Column(Text, nullable=False)       # JSON danh sách món
    dat_ban_json     = Column(Text, nullable=True)        # JSON thông tin đặt bàn mới (None = không đặt bàn mới)
    id_ban           = Column(Integer, ForeignKey("BAN.id_ban", ondelete="SET NULL"), nullable=True)     # Bàn ngồi trực tiếp
    id_datBan        = Column(Integer, ForeignKey("DATBAN.id_datBan", ondelete="SET NULL"), nullable=True)     # Đặt bàn sẵn có
    thoiGianDen      = Column(String(50), nullable=True)  # ISO string
    payment_mode     = Column(String(20), nullable=False)                 # "deposit" | "full"
    tong_tien        = Column(Numeric(12, 2), CheckConstraint('tong_tien >= 0'), nullable=False)             # Tổng tiền món ăn
    so_tien_thanh_toan = Column(Numeric(12, 2), CheckConstraint('so_tien_thanh_toan >= 0'), nullable=False)           # Số tiền cần trả ngay
    txn_ref          = Column(String(100), nullable=True) # VNPay TxnRef (set sau khi tạo URL)
    thoiGianTao      = Column(DateTime, default=get_vn_time, nullable=False)


class PendingOrderEdit(Base):
    """
    Lưu trữ tạm dữ liệu chỉnh sửa đơn hàng khi tổng mới > tổng cũ và đơn đã có cọc.
    Chờ khách thanh toán phần chênh lệch qua VNPay trước khi áp dụng thay đổi.
    Nếu thanh toán thành công → cập nhật chi tiết đơn hàng + ghi nhận ThanhToan bổ sung.
    Nếu thất bại / bỏ qua → xóa luôn, đơn giữ nguyên.
    """
    __tablename__ = "PENDING_ORDER_EDIT"
    id               = Column(Integer, primary_key=True, index=True)
    id_nguoiDung     = Column(Integer, ForeignKey("NGUOIDUNG.id_nguoiDung", ondelete="CASCADE"), nullable=False)
    id_donHang       = Column(Integer, ForeignKey("DONHANG.id_donHang", ondelete="CASCADE"), nullable=False)
    new_cart_json    = Column(Text, nullable=False)           # JSON danh sach mon moi
    old_total        = Column(Numeric(12, 2), nullable=False) # Tong tien don cu
    new_total        = Column(Numeric(12, 2), nullable=False) # Tong tien don moi
    so_tien_them     = Column(Numeric(12, 2), nullable=False) # So tien can coc them (10% hoac 100% chenh lech)
    hinhThucThanhToan = Column(String(20), nullable=True)     # "deposit" | "full" — hinh thuc thanh toan goc
    txn_ref          = Column(String(100), nullable=True)     # VNPay TxnRef
    thoiGianTao      = Column(DateTime, default=get_vn_time, nullable=False)
