from pydantic import BaseModel
from typing import Optional, Literal

# Dùng cho Đăng ký (Register)
class UserCreate(BaseModel):
    hoTen: str
    email: str
    soDienThoai: str
    matKhau: str

# Dùng cho Đăng nhập (Login)
class UserLogin(BaseModel):
    email: str
    matKhau: str

# Dữ liệu trả về (ẩn mật khẩu)
class UserResponse(BaseModel):
    id_nguoiDung: int
    hoTen: str
    email: str
    soDienThoai: str
    id_vaiTro: int
    tenVaiTro: Optional[str] = None
    trangThai: Optional[str] = "Hoạt động"
    
    class Config:
        from_attributes = True

# Admin tạo tài khoản nhân viên
class StaffCreate(BaseModel):
    hoTen: str
    email: str
    soDienThoai: str
    matKhau: str
    vaiTro: Literal["nv_phuc_vu", "nv_bep"]  # "nv_phuc_vu" = Nhân viên phục vụ, "nv_bep" = Nhân viên nhà bếp

# Token response
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Cập nhật hồ sơ cá nhân
class UserProfileUpdate(BaseModel):
    hoTen: str
    soDienThoai: str

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
