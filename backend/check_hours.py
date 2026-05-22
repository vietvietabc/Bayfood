import sys
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.database import SQLALCHEMY_DATABASE_URL
from app import models

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

today = date(2026, 5, 20)
wh = db.query(models.GioLamViec).filter(models.GioLamViec.ngay == today).first()
if wh:
    print(f"Today: {wh.ngay}, Open: {wh.gioMoCua}, Close: {wh.gioDongCua}, isNghi: {wh.isNghi}")
else:
    print("No custom working hours for today.")

default_wh = db.query(models.GioLamViec).all()
for d in default_wh:
    print(f"Date: {d.ngay}, Open: {d.gioMoCua}, Close: {d.gioDongCua}, isNghi: {d.isNghi}")

db.close()
