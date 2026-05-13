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

# Khởi tạo Engine kết nối tới MySQL
engine = create_engine(SQLALCHEMY_DATABASE_URL)

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