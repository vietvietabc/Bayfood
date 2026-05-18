from sqlalchemy import inspect, text
from app.db.database import engine

def run_migrations() -> None:
    inspector = inspect(engine)
    if not inspector.has_table("DATBAN"):
        return

    columns = {column["name"] for column in inspector.get_columns("DATBAN")}
    
    with engine.begin() as connection:
        # 1. thoiGianDenThucTe column
        if "thoiGianDenThucTe" not in columns:
            try:
                connection.execute(text('ALTER TABLE "DATBAN" ADD COLUMN "thoiGianDenThucTe" TIMESTAMP NULL'))
                print("Migration: Added Column 'thoiGianDenThucTe' (quoted) successfully!")
            except Exception as e1:
                try:
                    connection.execute(text("ALTER TABLE DATBAN ADD COLUMN thoiGianDenThucTe DATETIME NULL"))
                    print("Migration: Added Column 'thoiGianDenThucTe' (unquoted) successfully!")
                except Exception as e2:
                    print(f"Migration error (thoiGianDenThucTe): {e1} / {e2}")

        # 2. tienCoc column
        if "tienCoc" not in columns:
            try:
                connection.execute(text('ALTER TABLE "DATBAN" ADD COLUMN "tienCoc" INTEGER DEFAULT 0'))
                print("Migration: Added Column 'tienCoc' (quoted) successfully!")
            except Exception as e1:
                try:
                    connection.execute(text("ALTER TABLE DATBAN ADD COLUMN tienCoc INTEGER DEFAULT 0"))
                    print("Migration: Added Column 'tienCoc' (unquoted) successfully!")
                except Exception as e2:
                    print(f"Migration error (tienCoc): {e1} / {e2}")
                    
        # 3. trangThaiCoc column
        if "trangThaiCoc" not in columns:
            try:
                connection.execute(text('ALTER TABLE "DATBAN" ADD COLUMN "trangThaiCoc" VARCHAR(50) DEFAULT \'Chưa cọc\''))
                print("Migration: Added Column 'trangThaiCoc' (quoted) successfully!")
            except Exception as e1:
                try:
                    connection.execute(text("ALTER TABLE DATBAN ADD COLUMN trangThaiCoc VARCHAR(50) DEFAULT 'Chưa cọc'"))
                    print("Migration: Added Column 'trangThaiCoc' (unquoted) successfully!")
                except Exception as e2:
                    print(f"Migration error (trangThaiCoc): {e1} / {e2}")
