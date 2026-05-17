from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

class ChiTietDonHangCreate(BaseModel):
    id_monAn: int
    soLuong: int
    giaTaiThoiDiemBan: Decimal

class ChiTietDonHang(ChiTietDonHangCreate):
    id_chiTietDonHang: int
    id_donHang: int
    trangThaiMon: str
    class Config:
        from_attributes = True

class ChiTietDonHangDetail(BaseModel):
    id_chiTietDonHang: int
    id_donHang: int
    id_monAn: int
    tenMon: Optional[str] = None
    hinhAnhMon: Optional[str] = None
    soLuong: int
    giaTaiThoiDiemBan: Decimal
    trangThaiMon: str
    id_nhanVien_bep: Optional[int] = None
    tenNhanVienBep: Optional[str] = None   # Người chế biến
    class Config:
        from_attributes = True

class DonHangCreate(BaseModel):
    id_nguoiDung: int
    id_datBan: Optional[int] = None
    id_ban: Optional[int] = None
    chi_tiet: List[ChiTietDonHangCreate]

class DonHangCreateCustomer(BaseModel):
    id_datBan: Optional[int] = None
    id_ban: Optional[int] = None
    thoiGianDen: Optional[datetime] = None
    chi_tiet: List[ChiTietDonHangCreate]

class DatBanCreateForOrder(BaseModel):
    id_ban: Optional[int] = None
    thoiGianDen: datetime
    soNguoi: int
    ghiChu: Optional[str] = None

class OrderWithOptionalBookingCreate(BaseModel):
    id_ban: Optional[int] = None
    id_datBan: Optional[int] = None
    chi_tiet: List[ChiTietDonHangCreate]
    dat_ban: Optional[DatBanCreateForOrder] = None
    thoiGianDen: Optional[datetime] = None

class DonHang(BaseModel):
    id_donHang: int
    id_nguoiDung: int
    id_datBan: Optional[int] = None
    id_nhanVien: Optional[int] = None
    id_ban: Optional[int] = None
    thoiGianTao: datetime
    thoiGianDen: Optional[datetime] = None
    tinhTrang: str
    class Config:
        from_attributes = True

class DonHangDetail(BaseModel):
    id_donHang: int
    id_nguoiDung: int
    tenKhachHang: Optional[str] = None     # Người đặt
    id_datBan: Optional[int] = None
    id_ban: Optional[int] = None
    thoiGianTao: datetime
    thoiGianDen: Optional[datetime] = None
    tinhTrang: str
    id_nhanVien_phucvu: Optional[int] = None
    tenNhanVienPhucVu: Optional[str] = None  # Người phục vụ
    tongTien: Optional[Decimal] = None
    chi_tiet: List[ChiTietDonHangDetail] = []
    class Config:
        from_attributes = True

class DanhGiaBase(BaseModel):
    id_donHang: int
    soSao: int
    noiDung: Optional[str] = None

class DanhGiaCreate(DanhGiaBase):
    pass

class DanhGiaResponse(DanhGiaBase):
    id_danhGia: int
    id_nguoiDung: int

    class Config:
        from_attributes = True

class DonHangEditCustomer(BaseModel):
    thoiGianDen: Optional[datetime] = None
    chi_tiet: List[ChiTietDonHangCreate]
