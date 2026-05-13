from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.database import get_db
from app import models, schemas
from app.core.security import verify_password, get_password_hash, create_access_token, SECRET_KEY, ALGORITHM
from app.core.email import send_otp_email
import jwt
import json
import random
import time
from pathlib import Path
from jwt.exceptions import InvalidTokenError

router = APIRouter(prefix="/api/auth", tags=["Auth"])

# OAuth2 schema for Swagger UI and token parsing
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except InvalidTokenError:
        raise credentials_exception
        
    user = db.query(models.NguoiDung).filter(models.NguoiDung.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_admin(current_user: models.NguoiDung = Depends(get_current_user), db: Session = Depends(get_db)):
    vai_tro_admin = db.query(models.VaiTro).filter(models.VaiTro.tenVaiTro == "Quản lý").first()
    vai_tro_hien_tai = None
    if current_user.id_vaiTro is not None:
        vai_tro_hien_tai = db.query(models.VaiTro).filter(models.VaiTro.id_vaiTro == current_user.id_vaiTro).first()

    ten_vai_tro = (vai_tro_hien_tai.tenVaiTro if vai_tro_hien_tai else "").strip().lower()
    is_admin = (
        (vai_tro_admin is not None and current_user.id_vaiTro == vai_tro_admin.id_vaiTro)
        or current_user.id_vaiTro == 2
        or ten_vai_tro in {"quản lý", "quan ly"}
    )

    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền thực hiện hành động này (Yêu cầu quyền quản lý)"
        )
    return current_user

@router.post("/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if email exists
    db_user = db.query(models.NguoiDung).filter(models.NguoiDung.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email đã được đăng ký")
        
    # Lấy hoặc tạo vai trò Khách hàng
    vai_tro_khach = db.query(models.VaiTro).filter(models.VaiTro.tenVaiTro == "Khách hàng").first()
    if not vai_tro_khach:
        vai_tro_khach = models.VaiTro(tenVaiTro="Khách hàng")
        db.add(vai_tro_khach)
        db.commit()
        db.refresh(vai_tro_khach)
        
    hashed_password = get_password_hash(user.matKhau)
    new_user = models.NguoiDung(
        hoTen=user.hoTen,
        email=user.email,
        soDienThoai=user.soDienThoai,
        matKhau=hashed_password,
        id_vaiTro=vai_tro_khach.id_vaiTro
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
def login_user(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2PasswordRequestForm uses 'username' and 'password' fields. We will map username to email.
    user = db.query(models.NguoiDung).filter(models.NguoiDung.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.matKhau):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.trangThai == "Bị khóa":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.",
        )
        
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# Thêm endpoint đăng nhập dùng JSON raw (phụ trợ cho frontend dễ dùng hơn là FormData)
@router.post("/login/json", response_model=schemas.Token)
def login_user_json(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.NguoiDung).filter(models.NguoiDung.email == user_credentials.email).first()
    if not user or not verify_password(user_credentials.matKhau, user.matKhau):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác",
        )
    if user.trangThai == "Bị khóa":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.",
        )
        
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.NguoiDung = Depends(get_current_user), db: Session = Depends(get_db)):
    vai_tro = db.query(models.VaiTro).filter(models.VaiTro.id_vaiTro == current_user.id_vaiTro).first()
    return {
        "id_nguoiDung": current_user.id_nguoiDung,
        "hoTen": current_user.hoTen,
        "email": current_user.email,
        "soDienThoai": current_user.soDienThoai,
        "id_vaiTro": current_user.id_vaiTro,
        "tenVaiTro": vai_tro.tenVaiTro if vai_tro else None,
    }

OTP_CACHE_FILE = Path(__file__).resolve().parents[1] / "data" / "otp_cache.json"


def _load_otp_cache():
    try:
        if OTP_CACHE_FILE.exists():
            return json.loads(OTP_CACHE_FILE.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {}


def _save_otp_cache(cache_data):
    OTP_CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    OTP_CACHE_FILE.write_text(json.dumps(cache_data), encoding="utf-8")


otp_cache = _load_otp_cache()

@router.post("/forgot-password/send-otp")
def send_otp(req: schemas.SendOTPRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    user = db.query(models.NguoiDung).filter(models.NguoiDung.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email chưa được đăng ký trong hệ thống")
    
    otp_code = str(random.randint(100000, 999999))
    
    try:
        send_otp_email(email, otp_code)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    otp_cache[email] = {
        "otp": otp_code,
        "expires": time.time() + 300
    }
    _save_otp_cache(otp_cache)
    
    return {"message": "Mã OTP đã được gửi đến email của bạn"}

@router.post("/forgot-password/verify-reset")
def verify_reset(req: schemas.VerifyResetRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    otp = req.otp.strip()

    if email not in otp_cache:
        raise HTTPException(status_code=400, detail="Mã OTP không hợp lệ hoặc chưa được yêu cầu")
        
    cache_data = otp_cache[email]
    
    if time.time() > cache_data["expires"]:
        del otp_cache[email]
        _save_otp_cache(otp_cache)
        raise HTTPException(status_code=400, detail="Mã OTP đã hết hạn, vui lòng yêu cầu lại")
        
    if otp != cache_data["otp"]:
        raise HTTPException(status_code=400, detail="Mã OTP không chính xác")
        
    user = db.query(models.NguoiDung).filter(models.NguoiDung.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")
        
    hashed_password = get_password_hash(req.matKhauMoi)
    user.matKhau = hashed_password
    db.commit()
    
    del otp_cache[email]
    _save_otp_cache(otp_cache)
    
    return {"message": "Đổi mật khẩu thành công"}
