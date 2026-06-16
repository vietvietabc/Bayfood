from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── Session ──

class LiveChatSessionCreate(BaseModel):
    tenKhachHang: str  # Tên hiển thị của khách
    id_nguoiDung: Optional[int] = None  # ID tài khoản nếu khách đã đăng nhập

class LiveChatSessionResponse(BaseModel):
    id_phien: str
    id_nguoiDung: Optional[int] = None
    tenKhachHang: str
    id_nhanVien: Optional[int] = None
    tenNhanVien: Optional[str] = None
    trangThai: str
    thoiGianTao: datetime
    thoiGianDong: Optional[datetime] = None
    lastMessage: Optional[str] = None           
    unreadCount: int = 0                      

    class Config:
        from_attributes = True


# ── Message ──

class LiveChatMessageCreate(BaseModel):
    noiDung: str

class LiveChatMessageResponse(BaseModel):
    id_tinNhan: int
    id_phien: str
    nguoiGui: str          # 'customer' hoặc 'staff'
    id_nguoiGui: Optional[int] = None
    tenNguoiGui: str
    noiDung: str
    thoiGianGui: datetime

    class Config:
        from_attributes = True


# ── WebSocket ──

class WSChatMessage(BaseModel):
    """Định dạng tin nhắn trao đổi qua WebSocket."""
    type: str               # 'message' | 'status_change' | 'typing' | 'new_session'
    id_phien: str
    data: dict = {}
