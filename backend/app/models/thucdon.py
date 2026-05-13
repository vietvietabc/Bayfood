from sqlalchemy import Column, Integer, String, ForeignKey, Numeric
from app.db.database import Base

class DanhMuc(Base):
    __tablename__ = "DANHMUC"
    id_danhMuc = Column(Integer, primary_key=True, index=True)
    tenDanhMuc = Column(String(255))
    moTa = Column(String(255))

class ThucDon(Base):
    __tablename__ = "THUCDON"
    id_monAn = Column(Integer, primary_key=True, index=True)
    id_danhMuc = Column(Integer, ForeignKey("DANHMUC.id_danhMuc"))
    tenMon = Column(String(255))
    giaTien = Column(Numeric(10, 2))
    hinhAnh = Column(String(255))
    moTa = Column(String(255))
    trangThai = Column(String(50), default="Đang bán")
