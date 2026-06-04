from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.models.donhang import get_vn_time
import uuid


class LiveChatSession(Base):
    """Phiên chat trực tiếp giữa khách hàng và nhân viên."""
    __tablename__ = "phien_chat_tuvan"

    id_phien = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    id_nguoiDung = Column(Integer, ForeignKey("NGUOIDUNG.id_nguoiDung", ondelete="SET NULL"), nullable=True)
    tenKhachHang = Column(String(255), nullable=False)
    id_nhanVien = Column(Integer, ForeignKey("NGUOIDUNG.id_nguoiDung", ondelete="SET NULL"), nullable=True)
    tenNhanVien = Column(String(255), nullable=True)
    trangThai = Column(String(20), nullable=False, default="cho_nhan")  # cho_nhan | dang_chat | da_dong
    thoiGianTao = Column(DateTime, default=get_vn_time)
    thoiGianDong = Column(DateTime, nullable=True)

    messages = relationship("LiveChatMessage", back_populates="session", cascade="all, delete")


class LiveChatMessage(Base):
    """Tin nhắn trong phiên chat trực tiếp."""
    __tablename__ = "tin_nhan_tuvan"

    id_tinNhan = Column(Integer, primary_key=True, index=True)
    id_phien = Column(String(36), ForeignKey("phien_chat_tuvan.id_phien", ondelete="CASCADE"), nullable=False)
    nguoiGui = Column(String(20), nullable=False)  # 'khach_hang' hoặc 'nhan_vien'
    id_nguoiGui = Column(Integer, nullable=True)
    tenNguoiGui = Column(String(255), nullable=False)
    noiDung = Column(Text, nullable=False)
    thoiGianGui = Column(DateTime, default=get_vn_time)

    session = relationship("LiveChatSession", back_populates="messages")
