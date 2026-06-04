from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class DatBanCreate(BaseModel):
    id_nguoiDung: int
    id_ban: Optional[int] = None
    thoiGianDen: datetime
    soNguoi: int = Field(..., gt=0)
    ghiChu: Optional[str] = Field(None, max_length=255)

class DatBanCreateCustomer(BaseModel):
    id_ban: Optional[int] = None
    thoiGianDen: datetime
    soNguoi: int = Field(..., gt=0)
    ghiChu: Optional[str] = Field(None, max_length=255)

class DatBan(DatBanCreate):
    id_datBan: int
    id_ban: Optional[int] = None
    thoiGianDenThucTe: Optional[datetime] = None
    trangThai: str
    tienCoc: Optional[float] = Field(None, ge=0)
    trangThaiCoc: Optional[str] = None
    lyDoHuy: Optional[str] = Field(None, max_length=500)
    id_donHang: Optional[int] = None
    soPhutGiuChoConLai: Optional[int] = None
    tenKhachHang: Optional[str] = None   # Tên khách hàng (join NguoiDung)
    tenBan: Optional[str] = None         # Tên bàn (join Ban)
    class Config:
        from_attributes = True


class BanBase(BaseModel):
    tenBan: str = Field(..., max_length=255)
    sucChua: int = Field(..., gt=0)
    viTri: Optional[str] = Field("Tầng 1", max_length=100)
    hinhAnh: Optional[str] = Field(None, max_length=500)
    trangThai: Optional[str] = Field("Trống", max_length=50)
    tienCocMacDinh: Optional[float] = Field(0, ge=0, description="Mức tiền cọc mặc định cho bàn (VNĐ)")

class BanCreate(BanBase):
    pass

class BanResponse(BanBase):
    id_ban: int
    maQR_url: Optional[str] = None

    class Config:
        from_attributes = True
