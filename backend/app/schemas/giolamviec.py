from datetime import date
from typing import Optional

from pydantic import BaseModel


class GioLamViecBase(BaseModel):
    ngay: date
    gioMoCua: Optional[str] = None
    gioDongCua: Optional[str] = None
    isNghi: bool = False
    ghiChu: Optional[str] = None


class GioLamViecCreate(GioLamViecBase):
    pass


class GioLamViecResponse(GioLamViecBase):
    id_gioLamViec: Optional[int] = None
    source: Optional[str] = None

    class Config:
        from_attributes = True