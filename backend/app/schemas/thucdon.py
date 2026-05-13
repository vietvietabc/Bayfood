from pydantic import BaseModel
from typing import Optional
from decimal import Decimal

class DanhMucBase(BaseModel):
    tenDanhMuc: str
    moTa: Optional[str] = None

class DanhMucCreate(DanhMucBase):
    pass

class DanhMuc(DanhMucBase):
    id_danhMuc: int
    class Config:
        from_attributes = True

class ThucDonBase(BaseModel):
    id_danhMuc: int
    tenMon: str
    giaTien: Decimal
    hinhAnh: Optional[str] = None
    moTa: Optional[str] = None
    trangThai: Optional[str] = "Đang bán"

class ThucDon(ThucDonBase):
    id_monAn: int
    class Config:
        from_attributes = True
