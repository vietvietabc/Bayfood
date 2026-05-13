from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String

from app.db.database import Base


class ThongBao(Base):
    __tablename__ = "THONGBAO"

    id_thongBao = Column(Integer, primary_key=True, index=True)
    id_nguoiDung = Column(Integer, ForeignKey("NGUOIDUNG.id_nguoiDung"), nullable=True)
    vaiTroNhan = Column(String(50), nullable=True)
    tieuDe = Column(String(255))
    noiDung = Column(String(500))
    lienKet = Column(String(255), nullable=True)
    daDoc = Column(Boolean, default=False)
    thoiGianTao = Column(DateTime, default=datetime.utcnow)