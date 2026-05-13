from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from datetime import datetime
from app.db.database import Base

class VaiTro(Base):
    __tablename__ = "VAITRO"
    id_vaiTro = Column(Integer, primary_key=True, index=True)
    tenVaiTro = Column(String(255))

class NguoiDung(Base):
    __tablename__ = "NGUOIDUNG"
    id_nguoiDung = Column(Integer, primary_key=True, index=True)
    id_vaiTro = Column(Integer, ForeignKey("VAITRO.id_vaiTro"))
    hoTen = Column(String(255))
    soDienThoai = Column(String(20))
    email = Column(String(255), unique=True, index=True)
    matKhau = Column(String(255))
    trangThai = Column(String(50), default="Hoạt động")

class NhanVien(Base):
    __tablename__ = "NHANVIEN"
    id_nhanVien = Column(Integer, primary_key=True, index=True)
    id_nguoiDung = Column(Integer, ForeignKey("NGUOIDUNG.id_nguoiDung"), unique=True)
    ngayVaoLam = Column(DateTime, default=datetime.utcnow)
    caLamViec = Column(String(100))
    trangThai = Column(String(50), default="Đang làm")
