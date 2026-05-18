from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Numeric, Text
from datetime import datetime, timedelta
from app.db.database import Base

def get_vn_time():
    return datetime.utcnow() + timedelta(hours=7)

class DonHang(Base):
    __tablename__ = "DONHANG"
    id_donHang = Column(Integer, primary_key=True, index=True)
    id_nguoiDung = Column(Integer, ForeignKey("NGUOIDUNG.id_nguoiDung"))
    id_datBan = Column(Integer, ForeignKey("DATBAN.id_datBan"), nullable=True)
    id_nhanVien = Column(Integer, ForeignKey("NHANVIEN.id_nhanVien"), nullable=True)
    id_ban = Column(Integer, ForeignKey("BAN.id_ban"))
    thoiGianTao = Column(DateTime, default=get_vn_time)
    thoiGianDen = Column(DateTime, nullable=True)
    tinhTrang = Column(String(50), default="Đang chờ món")
    thoiGianHoanThanh = Column(DateTime, nullable=True)

class ChiTietDonHang(Base):
    __tablename__ = "CHITIETDONHANG"
    id_chiTietDonHang = Column(Integer, primary_key=True, index=True)
    id_donHang = Column(Integer, ForeignKey("DONHANG.id_donHang"))
    id_monAn = Column(Integer, ForeignKey("THUCDON.id_monAn"))
    id_nhanVien = Column(Integer, ForeignKey("NHANVIEN.id_nhanVien"), nullable=True) # Bếp nhận nấu
    soLuong = Column(Integer)
    giaTaiThoiDiemBan = Column(Numeric(10, 2))
    trangThaiMon = Column(String(50), default="Chờ chế biến")

class ThanhToan(Base):
    __tablename__ = "THANHTOAN"
    id_thanhToan = Column(Integer, primary_key=True, index=True)
    id_donHang = Column(Integer, ForeignKey("DONHANG.id_donHang"))
    phuongThuc = Column(String(50))
    soTienThanhToan = Column(Numeric(10, 2))
    thoiGianGiaoDich = Column(DateTime, default=get_vn_time)
    maQR_thanhToan = Column(String(255))

class DanhGia(Base):
    __tablename__ = "DANHGIA"
    id_danhGia = Column(Integer, primary_key=True, index=True)
    id_nguoiDung = Column(Integer, ForeignKey("NGUOIDUNG.id_nguoiDung"))
    id_donHang = Column(Integer, ForeignKey("DONHANG.id_donHang"))
    soSao = Column(Integer)
    noiDung = Column(Text)


class PendingOrder(Base):
    """
    Lưu trữ tạm dữ liệu giỏ hàng + đặt bàn của khách.
    Chỉ tồn tại đến khi VNPay trả về SUCCESS → chuyển thành DatBan + DonHang thật rồi bị xóa.
    Nếu thất bại → xóa luôn.
    """
    __tablename__ = "PENDING_ORDER"
    id               = Column(Integer, primary_key=True, index=True)
    id_nguoiDung     = Column(Integer, ForeignKey("NGUOIDUNG.id_nguoiDung"))
    cart_json        = Column(Text, nullable=False)       # JSON danh sách món
    dat_ban_json     = Column(Text, nullable=True)        # JSON thông tin đặt bàn mới (None = không đặt bàn mới)
    id_ban           = Column(Integer, nullable=True)     # Bàn ngồi trực tiếp
    id_datBan        = Column(Integer, nullable=True)     # Đặt bàn sẵn có
    thoiGianDen      = Column(String(50), nullable=True)  # ISO string
    payment_mode     = Column(String(20))                 # "deposit" | "full"
    tong_tien        = Column(Numeric(12, 2))             # Tổng tiền món ăn
    so_tien_thanh_toan = Column(Numeric(12, 2))           # Số tiền cần trả ngay
    txn_ref          = Column(String(100), nullable=True) # VNPay TxnRef (set sau khi tạo URL)
    thoiGianTao      = Column(DateTime, default=get_vn_time)
