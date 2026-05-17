from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
from app.api import thucdon, datban, donhang, auth, nguoidung, danhmuc, ban, danhgia, upload, thongbao, gio_lam_viec
from app.db.database import engine, Base
import os

# Đảm bảo các models được load đầy đủ để metadata nhận diện
from app import models

# Khởi tạo db (chỉ chạy lần đầu nếu chưa có bảng, nhưng vì đã có rồi nên có thể bỏ qua hoặc để lại để sync)
Base.metadata.create_all(bind=engine)



def _ensure_datban_arrival_time_column() -> None:
    inspector = inspect(engine)
    if not inspector.has_table("DATBAN"):
        return

    columns = {column["name"] for column in inspector.get_columns("DATBAN")}
    if "thoiGianDenThucTe" in columns:
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE DATBAN ADD COLUMN thoiGianDenThucTe DATETIME NULL"))


_ensure_datban_arrival_time_column()

# Tự động seed danh sách vai trò mặc định vào Database
def _seed_default_roles() -> None:
    from app.db.database import SessionLocal
    from app.models.nguoidung import VaiTro
    db = SessionLocal()
    try:
        # 1. Danh sách 4 vai trò cốt lõi (Viết hoa chữ cái đầu để chuẩn hóa)
        default_roles = [
            (1, "Khách hàng"),
            (2, "Quản lý"),
            (3, "Nhân viên nhà bếp"),
            (4, "Nhân viên phục vụ")
        ]
        
        # Đồng bộ và cập nhật 4 vai trò chuẩn
        for role_id, role_name in default_roles:
            role = db.query(VaiTro).filter(VaiTro.id_vaiTro == role_id).first()
            if not role:
                new_role = VaiTro(id_vaiTro=role_id, tenVaiTro=role_name)
                db.add(new_role)
            else:
                role.tenVaiTro = role_name # Cập nhật tên viết hoa chuẩn
        db.commit()

        # 2. Tự động tạo tài khoản Admin mặc định phụ nếu chưa có ai làm quản lý
        from app.models.nguoidung import NguoiDung
        from app.core.security import get_password_hash
        admin_exists = db.query(NguoiDung).filter(NguoiDung.id_vaiTro == 2).first()
        if not admin_exists:
            default_admin = NguoiDung(
                hoTen="Quản trị viên",
                email="admin@bayfood.com",
                soDienThoai="0999999999",
                matKhau=get_password_hash("Admin12345"),
                id_vaiTro=2,
                trangThai="Hoạt động"
            )
            db.add(default_admin)
            db.commit()
            print("Seeded default admin account!")

    except Exception as e:
        print(f"Error seeding default roles: {e}")
        db.rollback()
    finally:
        db.close()

_seed_default_roles()

# Khởi tạo app FastAPI
app = FastAPI(title="BayFood API", version="1.0")

# Exception handler toàn cục để bắt và log chi tiết lỗi 500 ra Render
from fastapi import Request
from fastapi.responses import JSONResponse
import traceback

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = "".join(traceback.format_exception(None, exc, exc.__traceback__))
    print("---------------- EXCEPTION CAUGHT ----------------")
    print(error_msg)
    print("--------------------------------------------------")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}", "traceback": error_msg}
    )

# Cấu hình CORS để Frontend (React) có thể gọi được API mà không bị chặn
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký các Router
app.include_router(auth.router)
app.include_router(thucdon.router)
app.include_router(datban.router)
app.include_router(donhang.router)
app.include_router(nguoidung.router)
app.include_router(danhmuc.router)
app.include_router(ban.router)
app.include_router(danhgia.router)
app.include_router(upload.router)
app.include_router(thongbao.router)
app.include_router(gio_lam_viec.router)

# Phục vụ file tĩnh (ảnh upload) tại đường dẫn /static
os.makedirs("app/static/uploads/tables", exist_ok=True)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# API test thử
@app.get("/")
def read_root():
    return {"message": "Chào mừng đến với hệ thống API của BayFood!"}