from sqlalchemy import inspect, text
from app.db.database import engine

def run_migrations() -> None:
    inspector = inspect(engine)

    # ── Tạo bảng GIOLAMVIEC nếu chưa tồn tại ─────────────────────────────────
    if not inspector.has_table("GIOLAMVIEC"):
        with engine.begin() as connection:
            try:
                connection.execute(text("""
                    CREATE TABLE "GIOLAMVIEC" (
                        "id_gioLamViec" SERIAL PRIMARY KEY,
                        "ngay" DATE NOT NULL UNIQUE,
                        "gioMoCua" VARCHAR(5),
                        "gioDongCua" VARCHAR(5),
                        "isNghi" BOOLEAN DEFAULT FALSE,
                        "ghiChu" VARCHAR(255)
                    )
                """))
                print("Migration: Created table 'GIOLAMVIEC' (PostgreSQL) successfully!")
            except Exception as e1:
                try:
                    connection.execute(text("""
                        CREATE TABLE IF NOT EXISTS GIOLAMVIEC (
                            id_gioLamViec INTEGER PRIMARY KEY AUTOINCREMENT,
                            ngay DATE NOT NULL UNIQUE,
                            gioMoCua VARCHAR(5),
                            gioDongCua VARCHAR(5),
                            isNghi BOOLEAN DEFAULT 0,
                            ghiChu VARCHAR(255)
                        )
                    """))
                    print("Migration: Created table 'GIOLAMVIEC' (SQLite) successfully!")
                except Exception as e2:
                    print(f"Migration error (GIOLAMVIEC create): {e1} / {e2}")

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

        # 4. lyDoHuy column
        if "lyDoHuy" not in columns:
            try:
                connection.execute(text('ALTER TABLE "DATBAN" ADD COLUMN "lyDoHuy" VARCHAR(500) NULL'))
                print("Migration: Added Column 'lyDoHuy' (quoted) successfully!")
            except Exception as e1:
                try:
                    connection.execute(text("ALTER TABLE DATBAN ADD COLUMN lyDoHuy VARCHAR(500) NULL"))
                    print("Migration: Added Column 'lyDoHuy' (unquoted) successfully!")
                except Exception as e2:
                    print(f"Migration error (lyDoHuy): {e1} / {e2}")

    if inspector.has_table("BAN"):
        ban_columns = {column["name"] for column in inspector.get_columns("BAN")}
        if "tienCocMacDinh" not in ban_columns:
            with engine.begin() as connection:
                try:
                    connection.execute(text('ALTER TABLE "BAN" ADD COLUMN "tienCocMacDinh" FLOAT DEFAULT 0'))
                    print("Migration: Added Column 'tienCocMacDinh' to 'BAN' successfully!")
                except Exception as e:
                    try:
                        connection.execute(text("ALTER TABLE BAN ADD COLUMN tienCocMacDinh FLOAT DEFAULT 0"))
                        print("Migration: Added Column 'tienCocMacDinh' to 'BAN' (unquoted) successfully!")
                    except Exception as e2:
                        print(f"Migration error (tienCocMacDinh): {e} / {e2}")

