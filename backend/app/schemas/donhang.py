from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

class ChiTietDonHangCreate(BaseModel):
    id_monAn: int
    soLuong: int = Field(..., gt=0)
    giaTaiThoiDiemBan: Decimal = Field(..., ge=0)

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
    soLuong: int = Field(..., gt=0)
    giaTaiThoiDiemBan: Decimal = Field(..., ge=0)
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
    soNguoi: int = Field(..., gt=0)
    ghiChu: Optional[str] = Field(None, max_length=255)

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
    tongTien: Optional[Decimal] = None  # Tổng tiền tính từ chi tiết đơn
    tenKhachHang: Optional[str] = None  # Tên khách hàng (join)
    tenBan: Optional[str] = None        # Tên bàn (join)
    class Config:
        from_attributes = True

class DonHangDetail(BaseModel):
    id_donHang: int
    id_nguoiDung: int
    tenKhachHang: Optional[str] = None 
    id_datBan: Optional[int] = None
    id_ban: Optional[int] = None
    thoiGianTao: datetime
    thoiGianDen: Optional[datetime] = None
    tinhTrang: str
    id_nhanVien_phucvu: Optional[int] = None
    tenNhanVienPhucVu: Optional[str] = None  
    tongTien: Optional[Decimal] = None
    tienCoc: Optional[Decimal] = None
    trangThaiCoc: Optional[str] = None
    tongThanhToan: Optional[Decimal] = 0.0 # Tổng số tiền đã thanh toán (từ bảng THANHTOAN)
    chi_tiet: List[ChiTietDonHangDetail] = []
    lich_su_chi_tiet: List[ChiTietDonHangDetail] = []  # Lịch sử các món đã hủy khi chỉnh sửa
    class Config:
        from_attributes = True

class DanhGiaBase(BaseModel):
    id_donHang: int
    id_monAn: Optional[int] = None
    soSao: int = Field(..., ge=1, le=5)
    noiDung: Optional[str] = None

class DanhGiaCreate(DanhGiaBase):
    pass

class DanhGiaResponse(DanhGiaBase):
    id_danhGia: int
    id_nguoiDung: int
    tenKhachHang: Optional[str] = None  # Tên khách hàng (join)
    tenMon: Optional[str] = None         # Tên món ăn nếu là đánh giá món

    class Config:
        from_attributes = True

class DonHangEditCustomer(BaseModel):
    thoiGianDen: Optional[datetime] = None
    chi_tiet: List[ChiTietDonHangCreate]
