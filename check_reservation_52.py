"""
Kiểm tra thông tin đơn đặt bàn #52
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from sqlalchemy import create_engine, text
from app.db.database import engine

# Query đơn #52
query = text("""
    SELECT 
        id_datBan,
        id_ban,
        thoiGianDen,
        trangThai,
        soNguoi,
        DATE_FORMAT(thoiGianDen, '%Y-%m-%d %H:%i:%s') as formatted_time
    FROM DATBAN
    WHERE id_datBan IN (52, 53)
    ORDER BY id_datBan
""")

with engine.connect() as conn:
    result = conn.execute(query)
    print("=" * 80)
    print("THÔNG TIN ĐẶT BÀN #52 VÀ #53")
    print("=" * 80)
    for row in result:
        print(f"\nĐơn #{row.id_datBan}:")
        print(f"  - Bàn: #{row.id_ban}")
        print(f"  - Thời gian đến: {row.formatted_time}")
        print(f"  - Trạng thái: {row.trangThai}")
        print(f"  - Số người: {row.soNguoi}")
    print("\n" + "=" * 80)
