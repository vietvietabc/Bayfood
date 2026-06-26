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

    # Drop old tables to migrate to Vietnamese tables
    if inspector.has_table("PENDING_ORDER") or inspector.has_table("PENDING_ORDER_EDIT"):
        with engine.begin() as connection:
            try:
                if inspector.has_table("PENDING_ORDER"):
                    connection.execute(text('DROP TABLE "PENDING_ORDER"'))
                if inspector.has_table("PENDING_ORDER_EDIT"):
                    connection.execute(text('DROP TABLE "PENDING_ORDER_EDIT"'))
                print("Migration: Dropped old pending order tables successfully!")
            except Exception as e:
                try:
                    if inspector.has_table("PENDING_ORDER"):
                        connection.execute(text('DROP TABLE PENDING_ORDER'))
                    if inspector.has_table("PENDING_ORDER_EDIT"):
                        connection.execute(text('DROP TABLE PENDING_ORDER_EDIT'))
                    print("Migration: Dropped old pending order tables (unquoted) successfully!")
                except Exception as e2:
                    print(f"Migration error (Drop old pending tables): {e} / {e2}")

