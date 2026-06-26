import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})

MIGRATIONS = [
    ("tienCoc",      "ALTER TABLE DATBAN ADD COLUMN tienCoc REAL"),
    ("trangThaiCoc", "ALTER TABLE DATBAN ADD COLUMN trangThaiCoc VARCHAR(50)"),
    ("lyDoHuy",      "ALTER TABLE DATBAN ADD COLUMN lyDoHuy VARCHAR(500)"),
]

with engine.connect() as conn:
    for col_name, sql in MIGRATIONS:
        try:
            conn.execute(text(sql))
            conn.commit()
            print(f"[OK] Da them cot: {col_name}")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print(f"[SKIP] Cot {col_name} da ton tai.")
            else:
                print(f"[ERROR] Loi cot {col_name}: {e}")

print("[DONE] Migration hoan tat!")
