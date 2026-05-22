from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class GioLamViecBase(BaseModel):
    ngay: date
    gioMoCua: Optional[str] = Field(None, pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    gioDongCua: Optional[str] = Field(None, pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    isNghi: bool = False
    ghiChu: Optional[str] = Field(None, max_length=255)


class GioLamViecCreate(GioLamViecBase):
    pass


class GioLamViecResponse(GioLamViecBase):
    id_gioLamViec: Optional[int] = None
    source: Optional[str] = None

    class Config:
        from_attributes = True