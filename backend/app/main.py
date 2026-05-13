from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
from app.api import thucdon, datban, donhang, auth, nguoidung, danhmuc, ban, danhgia, upload, thongbao
from app.db.database import engine, Base
import os

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

# Phục vụ file tĩnh (ảnh upload) tại đường dẫn /static
os.makedirs("app/static/uploads/tables", exist_ok=True)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# API test thử
@app.get("/")
def read_root():
    return {"message": "Chào mừng đến với hệ thống API của BayFood!"}