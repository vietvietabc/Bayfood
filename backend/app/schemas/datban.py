from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DatBanCreate(BaseModel):
    id_nguoiDung: int
    id_ban: Optional[int] = None
    thoiGianDen: datetime
    soNguoi: int
    ghiChu: Optional[str] = None

class DatBanCreateCustomer(BaseModel):
    id_ban: Optional[int] = None
    thoiGianDen: datetime
    soNguoi: int
    ghiChu: Optional[str] = None

class DatBan(DatBanCreate):
    id_datBan: int
    id_ban: Optional[int] = None
    thoiGianDenThucTe: Optional[datetime] = None
    trangThai: str
    class Config:
        from_attributes = True

class BanBase(BaseModel):
    tenBan: str
    sucChua: int
    viTri: Optional[str] = "Tầng 1"
    hinhAnh: Optional[str] = None
    trangThai: Optional[str] = "Trống"

class BanCreate(BanBase):
    pass

class BanResponse(BanBase):
    id_ban: int
    maQR_url: Optional[str] = None

    class Config:
        from_attributes = True
