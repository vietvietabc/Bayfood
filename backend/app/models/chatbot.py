from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.models.donhang import get_vn_time
import uuid

class ChatSession(Base):
    __tablename__ = "phien_chat_bot"

    id_phien = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    id_nguoiDung = Column(Integer, ForeignKey("NGUOIDUNG.id_nguoiDung"), nullable=True) # Optional for logged in users
    thoiGianTao = Column(DateTime, default=get_vn_time)

    # Relationships
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete")

class ChatMessage(Base):
    __tablename__ = "tin_nhan_bot"

    id_tinNhan = Column(Integer, primary_key=True, index=True)
    id_phien = Column(String(36), ForeignKey("phien_chat_bot.id_phien"), nullable=False)
    nguoiGui = Column(String(20), nullable=False) # 'khach_hang' or 'he_thong'
    noiDung = Column(Text, nullable=False)
    thoiGianGui = Column(DateTime, default=get_vn_time)

    # Relationships
    session = relationship("ChatSession", back_populates="messages")
