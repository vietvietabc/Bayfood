from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Optional
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import SECRET_KEY, ALGORITHM
from app.models.nguoidung import NguoiDung, VaiTro
from app.core.websocket import manager
import jwt

router = APIRouter(prefix="/ws", tags=["WebSocket Thông Báo"])

def get_user_from_token(token: str, db: Session) -> Optional[NguoiDung]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            return None
        user = db.query(NguoiDung).filter(NguoiDung.email == email).first()
        return user
    except Exception:
        return None

@router.websocket("/thongbao/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str, db: Session = Depends(get_db)):
    user = get_user_from_token(token, db)
    if not user:
        await websocket.close(code=1008) # Policy violation
        return

    role_name = None
    if user.id_vaiTro:
        role = db.query(VaiTro).filter(VaiTro.id_vaiTro == user.id_vaiTro).first()
        if role:
            role_name = role.tenVaiTro

    await manager.connect(websocket, user.id_nguoiDung, role_name)
    try:
        while True:
            # Keep connection alive, wait for client to send ping or just listen
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user.id_nguoiDung, role_name)
