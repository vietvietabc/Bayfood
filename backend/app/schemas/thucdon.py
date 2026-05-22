from pydantic import BaseModel, Field
from typing import Optional
from decimal import Decimal

class DanhMucBase(BaseModel):
    tenDanhMuc: str = Field(..., max_length=255)
    moTa: Optional[str] = Field(None, max_length=255)

class DanhMucCreate(DanhMucBase):
    pass

class DanhMuc(DanhMucBase):
    id_danhMuc: int
    class Config:
        from_attributes = True

class ThucDonBase(BaseModel):
    id_danhMuc: int
    tenMon: str = Field(..., max_length=255)
    giaTien: Decimal = Field(..., ge=0)
    hinhAnh: Optional[str] = Field(None, max_length=255)
    moTa: Optional[str] = Field(None, max_length=255)
    trangThai: Optional[str] = "Đang bán"

class ThucDon(ThucDonBase):
    id_monAn: int
    class Config:
        from_attributes = True

class MonAnDanhGia(BaseModel):
    id_danhGia: int
    id_nguoiDung: int
    tenNguoiDung: str
    soSao: int = Field(..., ge=1, le=5)
    noiDung: Optional[str] = None
    
    class Config:
        from_attributes = True
