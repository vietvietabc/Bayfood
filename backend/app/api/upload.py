from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.api.auth import get_current_admin
from app import models
import os
import uuid

router = APIRouter(prefix="/api/upload", tags=["Upload"])

UPLOAD_DIR = "app/static/uploads/tables"

@router.post("/table-image")
async def upload_table_image(
    file: UploadFile = File(...),
    current_admin: models.NguoiDung = Depends(get_current_admin)
):
    # Kiểm tra định dạng file
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận file ảnh (JPG, PNG, WEBP, GIF)")
    
    # Kiểm tra kích thước file (tối đa 5MB)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File quá lớn! Tối đa 5MB.")

    # Tạo tên file duy nhất để tránh trùng lặp
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    # Lưu file vào thư mục
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with open(filepath, "wb") as f:
        f.write(contents)

    # Trả về URL để Frontend lưu vào DB
    file_url = f"http://localhost:8000/static/uploads/tables/{filename}"
    return {"url": file_url, "filename": filename}
