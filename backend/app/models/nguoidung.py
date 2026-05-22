from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Date
from datetime import datetime, timedelta
from app.db.database import Base

def get_vn_time():
    return datetime.utcnow() + timedelta(hours=7)

class VaiTro(Base):
    __tablename__ = "VAITRO"
    id_vaiTro = Column(Integer, primary_key=True, index=True)
    tenVaiTro = Column(String(255))

class NguoiDung(Base):
    __tablename__ = "NGUOIDUNG"
    id_nguoiDung = Column(Integer, primary_key=True, index=True)
    id_vaiTro = Column(Integer, ForeignKey("VAITRO.id_vaiTro", ondelete="SET NULL"), nullable=True)
    hoTen = Column(String(255), nullable=False)
    soDienThoai = Column(String(20), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    matKhau = Column(String(255), nullable=False)
    trangThai = Column(String(50), default="Hoạt động", nullable=False)

class NhanVien(Base):
    __tablename__ = "NHANVIEN"
    id_nhanVien = Column(Integer, primary_key=True, index=True)
    id_nguoiDung = Column(Integer, ForeignKey("NGUOIDUNG.id_nguoiDung", ondelete="CASCADE"), unique=True, nullable=False)
    ngayVaoLam = Column(DateTime, default=get_vn_time, nullable=False)
    caLamViec = Column(String(100))
    trangThai = Column(String(50), default="Đang làm", nullable=False)

class LichSuCa(Base):
    """Lưu lịch sử vào ca / tan ca của nhân viên."""
    __tablename__ = "LICHSUCA"
    id_lichSuCa = Column(Integer, primary_key=True, index=True)
    id_nhanVien = Column(Integer, ForeignKey("NHANVIEN.id_nhanVien", ondelete="CASCADE"), nullable=False)
    ngay = Column(Date, nullable=False)          # Ngày làm việc (VD: 2026-05-17)
    caLamViec = Column(String(100))              # Ca sáng / Ca chiều / Ca tối
    thoiGianVao = Column(DateTime, nullable=False)   # Giờ check-in
    thoiGianRa = Column(DateTime, nullable=True)     # Giờ tan ca (null nếu chưa tan)

