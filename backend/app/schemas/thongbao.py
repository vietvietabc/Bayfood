from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ThongBaoBase(BaseModel):
    id_nguoiDung: Optional[int] = None
    vaiTroNhan: Optional[str] = Field(None, max_length=50)
    tieuDe: str = Field(..., max_length=255)
    noiDung: str = Field(..., max_length=500)
    lienKet: Optional[str] = Field(None, max_length=255)


class ThongBaoCreate(ThongBaoBase):
    pass


class ThongBaoResponse(ThongBaoBase):
    id_thongBao: int
    daDoc: bool
    thoiGianTao: datetime

    class Config:
        from_attributes = True