from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from pathlib import Path
from dotenv import load_dotenv

# Load các biến môi trường từ file .env
load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env")

# Lấy chuỗi kết nối Database
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Hỗ trợ tự động chuyển đổi postgres:// thành postgresql:// cho tương thích SQLAlchemy V2
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Cấu hình engine kết nối an toàn cho cả SQLite và PostgreSQL
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,       # Tự động kiểm tra kết nối trước khi dùng (tránh stale)
        pool_recycle=300,         # Tái tạo kết nối sau 5 phút
        pool_size=5,              # Số kết nối tối đa trong pool
        max_overflow=10,          # Số kết nối tạm thêm khi pool đầy
    )

# Tạo phiên làm việc (Session)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class để các Model kế thừa (Chuyển ERD thành Code)
Base = declarative_base()

# Hàm lấy DB Session để dùng trong các API sau này
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()