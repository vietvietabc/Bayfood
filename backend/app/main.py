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
        # Danh sách vai trò mặc định
        default_roles = [
            (1, "Khách hàng"),
            (2, "Quản lý"),
            (3, "Nhân viên nhà bếp"),
            (4, "Nhân viên phục vụ")
        ]
        for role_id, role_name in default_roles:
            exists = db.query(VaiTro).filter(VaiTro.id_vaiTro == role_id).first()
            if not exists:
                new_role = VaiTro(id_vaiTro=role_id, tenVaiTro=role_name)
                db.add(new_role)
        db.commit()

        # Tự động tạo tài khoản Admin mặc định nếu chưa có tài khoản nào có vai trò Quản lý (id_vaiTro = 2)
        from app.models.nguoidung import NguoiDung
        from app.core.security import get_password_hash
        
        admin_exists = db.query(NguoiDung).filter(NguoiDung.id_vaiTro == 2).first()
        if not admin_exists:
            # Tạo tài khoản admin mặc định cực kỳ an toàn
            default_admin = NguoiDung(
                hoTen="Quản trị viên",
                email="admin@bayfood.com",
                soDienThoai="0999999999",
                matKhau=get_password_hash("Admin12345"),
                id_vaiTro=2, # Vai trò Quản lý
                trangThai="Hoạt động"
            )
            db.add(default_admin)
            db.commit()
            print("Successfully seeded default admin account: admin@bayfood.com / Admin12345")
            
    except Exception as e:
        print(f"Error seeding roles or admin: {e}")
        db.rollback()
    finally:
        db.close()

_seed_default_roles()

# Khởi tạo app FastAPI
app = FastAPI(title="BayFood API", version="1.0")

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