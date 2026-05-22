from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, CheckConstraint
from datetime import datetime
from app.db.database import Base

class Ban(Base):
    __tablename__ = "BAN"
    id_ban = Column(Integer, primary_key=True, index=True)
    tenBan = Column(String(255), nullable=False)
    sucChua = Column(Integer, CheckConstraint('sucChua > 0'), nullable=False)
    trangThai = Column(String(50), default="Trống", nullable=False)
    maQR_url = Column(String(255), nullable=True)
    viTri = Column(String(100), default="Tầng 1")
    hinhAnh = Column(String(500), nullable=True)
    tienCocMacDinh = Column(Float, nullable=True, default=0)  # Mức tiền cọc mặc định admin thiết lập cho bàn (VNĐ)

class DatBan(Base):
    __tablename__ = "DATBAN"
    id_datBan = Column(Integer, primary_key=True, index=True)
    id_ban = Column(Integer, ForeignKey("BAN.id_ban", ondelete="SET NULL"), nullable=True)
    id_nguoiDung = Column(Integer, ForeignKey("NGUOIDUNG.id_nguoiDung", ondelete="CASCADE"), nullable=False)
    thoiGianDen = Column(DateTime, nullable=False)
    thoiGianDenThucTe = Column(DateTime, nullable=True)
    soNguoi = Column(Integer, CheckConstraint('soNguoi > 0'), nullable=False)
    ghiChu = Column(String(255), nullable=True)
    trangThai = Column(String(50), default="Chờ xác nhận", nullable=False)
    # Tiền cọc
    tienCoc = Column(Float, CheckConstraint('tienCoc >= 0'), nullable=True, default=None)          # Số tiền cọc (VNĐ)
    trangThaiCoc = Column(String(50), nullable=True, default=None) # 'Chưa cọc' | 'Đã cọc' | 'Mất cọc' | 'Hoàn cọc'
    lyDoHuy = Column(String(500), nullable=True, default=None)     # Lý do hủy / vắng mặt
