from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float
from datetime import datetime
from app.db.database import Base

class Ban(Base):
    __tablename__ = "BAN"
    id_ban = Column(Integer, primary_key=True, index=True)
    tenBan = Column(String(255))
    sucChua = Column(Integer)
    trangThai = Column(String(50), default="Trống")
    maQR_url = Column(String(255))
    viTri = Column(String(100), default="Tầng 1")
    hinhAnh = Column(String(500), nullable=True)

class DatBan(Base):
    __tablename__ = "DATBAN"
    id_datBan = Column(Integer, primary_key=True, index=True)
    id_ban = Column(Integer, ForeignKey("BAN.id_ban"), nullable=True)
    id_nguoiDung = Column(Integer, ForeignKey("NGUOIDUNG.id_nguoiDung"))
    thoiGianDen = Column(DateTime)
    thoiGianDenThucTe = Column(DateTime, nullable=True)
    soNguoi = Column(Integer)
    ghiChu = Column(String(255))
    trangThai = Column(String(50), default="Chờ xác nhận")
    # Tiền cọc
    tienCoc = Column(Float, nullable=True, default=None)          # Số tiền cọc (VNĐ)
    trangThaiCoc = Column(String(50), nullable=True, default=None) # 'Chưa cọc' | 'Đã cọc' | 'Mất cọc' | 'Hoàn cọc'
    lyDoHuy = Column(String(500), nullable=True, default=None)     # Lý do hủy / vắng mặt
