from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal

# Dùng cho Đăng ký (Register)
class UserCreate(BaseModel):
    hoTen: str = Field(..., max_length=255)
    email: EmailStr
    soDienThoai: str = Field(..., min_length=10, max_length=20)
    matKhau: str = Field(..., min_length=6, max_length=255)

# Dùng cho Đăng nhập (Login)
class UserLogin(BaseModel):
    email: EmailStr
    matKhau: str

# Dữ liệu trả về (ẩn mật khẩu)
class UserResponse(BaseModel):
    id_nguoiDung: int
    hoTen: str
    email: EmailStr
    soDienThoai: str
    id_vaiTro: Optional[int] = None
    tenVaiTro: Optional[str] = None
    trangThai: Optional[str] = "Hoạt động"
    caLamViec: Optional[str] = None
    
    class Config:
        from_attributes = True

# Admin tạo tài khoản nhân viên
class StaffCreate(BaseModel):
    hoTen: str = Field(..., max_length=255)
    email: EmailStr
    soDienThoai: str = Field(..., min_length=10, max_length=20)
    matKhau: str = Field(..., min_length=6, max_length=255)
    vaiTro: Literal["nv_phuc_vu", "nv_bep"]  # "nv_phuc_vu" = Nhân viên phục vụ, "nv_bep" = Nhân viên nhà bếp

# Token response
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[EmailStr] = None

# Cập nhật hồ sơ cá nhân
class UserProfileUpdate(BaseModel):
    hoTen: str = Field(..., max_length=255)
    soDienThoai: str = Field(..., min_length=10, max_length=20)

# Đổi mật khẩu (cần xác nhận mật khẩu cũ)
class ChangePasswordRequest(BaseModel):
    matKhauCu: str
    matKhauMoi: str

# Dùng cho Quên mật khẩu
class SendOTPRequest(BaseModel):
    email: str

class VerifyResetRequest(BaseModel):
    email: str
    otp: str
    matKhauMoi: str
