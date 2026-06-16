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
    id_monAn = Column(Integer, ForeignKey("THUCDON.id_monAn", ondelete="CASCADE"), nullable=True)
    soSao = Column(Integer, CheckConstraint('soSao >= 1 AND soSao <= 5'), nullable=False)
    noiDung = Column(Text, nullable=True)


class DonHangChoThanhToan(Base):
    __tablename__ = "DONHANG_CHOTHANHTOAN"
    id               = Column(Integer, primary_key=True, index=True)
    id_nguoiDung     = Column(Integer, ForeignKey("NGUOIDUNG.id_nguoiDung", ondelete="CASCADE"), nullable=False)
    gioHang_json     = Column(Text, nullable=False)       # JSON danh sách món
    datBan_json      = Column(Text, nullable=True)        # JSON thông tin đặt bàn mới (None = không đặt bàn mới)
    id_ban           = Column(Integer, ForeignKey("BAN.id_ban", ondelete="SET NULL"), nullable=True)     # Bàn ngồi trực tiếp
    id_datBan        = Column(Integer, ForeignKey("DATBAN.id_datBan", ondelete="SET NULL"), nullable=True)     # Đặt bàn sẵn có
    thoiGianDen      = Column(String(50), nullable=True)  # ISO string
    hinhThucThanhToan = Column(String(20), nullable=False)                 # "đặt cọc" | "toàn bộ"
    tongTien         = Column(Numeric(12, 2), CheckConstraint('tongTien >= 0'), nullable=False)             # Tổng tiền món ăn
    soTienThanhToan  = Column(Numeric(12, 2), CheckConstraint('soTienThanhToan >= 0'), nullable=False)           # Số tiền cần trả ngay
    maGiaoDich       = Column(String(100), nullable=True) # VNPay TxnRef (set sau khi tạo URL)
    thoiGianTao      = Column(DateTime, default=get_vn_time, nullable=False)
    trangThai        = Column(String(50), default="Đang chờ", nullable=False)


class ChinhSuaDonHangChoThanhToan(Base):
    __tablename__ = "CHINHSUA_DONHANG_CHOTHANHTOAN"
    id               = Column(Integer, primary_key=True, index=True)
    id_nguoiDung     = Column(Integer, ForeignKey("NGUOIDUNG.id_nguoiDung", ondelete="CASCADE"), nullable=False)
    id_donHang       = Column(Integer, ForeignKey("DONHANG.id_donHang", ondelete="CASCADE"), nullable=False)
    gioHangMoi_json  = Column(Text, nullable=False)           # JSON danh sach mon moi
    tongTienCu       = Column(Numeric(12, 2), nullable=False) # Tong tien don cu
    tongTienMoi      = Column(Numeric(12, 2), nullable=False) # Tong tien don moi
    soTienThem       = Column(Numeric(12, 2), nullable=False) # So tien can coc them (10% hoac 100% chenh lech)
    hinhThucThanhToan = Column(String(20), nullable=True)     # "đặt cọc" | "toàn bộ" — hinh thuc thanh toan goc
    maGiaoDich       = Column(String(100), nullable=True)     # VNPay TxnRef
    thoiGianTao      = Column(DateTime, default=get_vn_time, nullable=False)
    trangThai        = Column(String(50), default="Đang chờ", nullable=False)
