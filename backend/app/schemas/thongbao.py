from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ThongBaoBase(BaseModel):
    id_nguoiDung: Optional[int] = None
    vaiTroNhan: Optional[str] = None
    tieuDe: str
    noiDung: str
    lienKet: Optional[str] = None


class ThongBaoCreate(ThongBaoBase):
    pass


class ThongBaoResponse(ThongBaoBase):
    id_thongBao: int
    daDoc: bool
    thoiGianTao: datetime

    class Config:
        from_attributes = True