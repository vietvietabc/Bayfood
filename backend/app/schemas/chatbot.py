from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ChatMessageBase(BaseModel):
    noiDung: str

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessageResponse(ChatMessageBase):
    id_tinNhan: int
    id_phien: str
    nguoiGui: str
    thoiGianGui: datetime

    class Config:
        from_attributes = True

class ChatSessionResponse(BaseModel):
    id_phien: str
    id_nguoiDung: Optional[int] = None
    thoiGianTao: datetime
    
    class Config:
        from_attributes = True
