from sqlalchemy import Column, Integer, String, Boolean, Date

from app.db.database import Base


class GioLamViec(Base):
    __tablename__ = "GIOLAMVIEC"

    id_gioLamViec = Column(Integer, primary_key=True, index=True)
    ngay = Column(Date, unique=True, index=True, nullable=False)
    gioMoCua = Column(String(5), nullable=True)
    gioDongCua = Column(String(5), nullable=True)
    isNghi = Column(Boolean, default=False)
    ghiChu = Column(String(255), nullable=True)