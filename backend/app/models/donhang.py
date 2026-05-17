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
