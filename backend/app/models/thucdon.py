from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, CheckConstraint
from app.db.database import Base

class DanhMuc(Base):
    __tablename__ = "DANHMUC"
    id_danhMuc = Column(Integer, primary_key=True, index=True)
    tenDanhMuc = Column(String(255), nullable=False)
    moTa = Column(String(255), nullable=True)

class ThucDon(Base):
    __tablename__ = "THUCDON"
    id_monAn = Column(Integer, primary_key=True, index=True)
    id_danhMuc = Column(Integer, ForeignKey("DANHMUC.id_danhMuc", ondelete="SET NULL"), nullable=True)
    tenMon = Column(String(255), nullable=False)
    giaTien = Column(Numeric(10, 2), CheckConstraint('giaTien >= 0'), nullable=False)
    hinhAnh = Column(String(255), nullable=True)
    moTa = Column(String(255), nullable=True)
    trangThai = Column(String(50), default="Đang bán", nullable=False)
