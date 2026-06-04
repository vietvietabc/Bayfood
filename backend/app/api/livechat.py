from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import asyncio
import json
import jwt

from app.db.database import get_db, SessionLocal
from app.models.livechat import LiveChatSession, LiveChatMessage
from app.models.nguoidung import NguoiDung, VaiTro
from app.schemas.livechat import (
    LiveChatSessionCreate,
    LiveChatSessionResponse,
    LiveChatMessageCreate,
    LiveChatMessageResponse,
    WSChatMessage,
)
from app.core.security import SECRET_KEY, ALGORITHM
from app.core.websocket import manager

router = APIRouter(prefix="/livechat", tags=["Live Chat"])

# ── WebSocket manager riêng cho live chat ──

class LiveChatManager:
    """Quản lý kết nối WebSocket cho live chat."""

    def __init__(self):
        # { session_id: { user_id: ws, user_id2: ws2 } }
        self.connections: Dict[str, Dict[int, WebSocket]] = {}
        # { ws: (user_id, id_phien) } để dễ tra cứu khi disconnect
        self.ws_info: Dict[WebSocket, tuple] = {}

    async def connect(self, ws: WebSocket, user_id: int, id_phien: str):
        await ws.accept()
        if id_phien not in self.connections:
            self.connections[id_phien] = {}
        self.connections[id_phien][user_id] = ws
        self.ws_info[ws] = (user_id, id_phien)

    def disconnect(self, ws: WebSocket):
        info = self.ws_info.pop(ws, None)
        if info:
            user_id, id_phien = info
            if id_phien in self.connections:
                self.connections[id_phien].pop(user_id, None)
                if not self.connections[id_phien]:
                    del self.connections[id_phien]

    async def send_to_session(self, id_phien: str, message: dict, exclude_user: Optional[int] = None):
        """Gửi tin nhắn đến tất cả user trong phiên, có thể loại trừ người gửi."""
        if id_phien in self.connections:
            for uid, ws in list(self.connections[id_phien].items()):
                if exclude_user is not None and uid == exclude_user:
                    continue
                try:
                    await ws.send_text(json.dumps(message))
                except Exception:
                    pass

    async def notify_staff_new_session(self, session_data: dict):
        """Gửi thông báo đến tất cả nhân viên (quản lý và phục vụ) về phiên chat mới."""
        message = {
            "type": "new_session",
            "id_phien": session_data["id_phien"],
            "data": session_data,
        }
        for role_name in ["Quản lý", "Nhân viên phục vụ"]:
            await manager.broadcast_to_role(message, role_name)


livechat_manager = LiveChatManager()

# ── Auto-close inactive sessions ──

async def auto_close_inactive_sessions():
    """Tự động đóng các phiên chat không có tương tác trong 10 phút."""
    while True:
        await asyncio.sleep(60)  # Chạy mỗi phút 1 lần
        db = SessionLocal()
        try:
            ten_mins_ago = datetime.utcnow() - timedelta(minutes=10)
            
            # Lấy các phiên đang chờ hoặc đang chat
            active_sessions = db.query(LiveChatSession).filter(
                LiveChatSession.trangThai.in_(["cho_nhan", "dang_chat"])
            ).all()
            
            for session in active_sessions:
                # Tìm tin nhắn cuối cùng
                last_msg = (
                    db.query(LiveChatMessage)
                    .filter(LiveChatMessage.id_phien == session.id_phien)
                    .order_by(desc(LiveChatMessage.thoiGianGui))
                    .first()
                )
                
                # Thời điểm tính mốc: tin nhắn cuối hoặc lúc tạo session
                last_time = last_msg.thoiGianGui if (last_msg and last_msg.thoiGianGui) else session.thoiGianTao
                
                if last_time and last_time < ten_mins_ago:
                    session.trangThai = "da_dong"
                    session.thoiGianDong = datetime.utcnow()
                    
                    # Gửi thông báo đến WebSocket
                    await livechat_manager.send_to_session(
                        session.id_phien,
                        {
                            "type": "status_change",
                            "data": {"trangThai": "da_dong", "message": "Phiên chat đã tự động kết thúc do không có tương tác"}
                        }
                    )
                    
                    # Nếu đang ở Frontend Staff Chat Panel, việc nhận status_change = da_dong sẽ ẩn session.
            
            db.commit()
        except Exception as e:
            print(f"Error in auto_close_inactive_sessions: {e}")
        finally:
            db.close()

@router.on_event("startup")
async def startup_event():
    asyncio.create_task(auto_close_inactive_sessions())



# ── Helper ──

def get_user_from_token(token: str, db: Session) -> Optional[NguoiDung]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            return None
        return db.query(NguoiDung).filter(NguoiDung.email == email).first()
    except Exception:
        return None


def _session_to_response(session: LiveChatSession, db: Optional[Session] = None) -> LiveChatSessionResponse:
    """Chuyển đổi session thành response, kèm lastMessage và unreadCount."""
    last_msg = None
    unread = 0
    if db:
        last_msg = (
            db.query(LiveChatMessage)
            .filter(LiveChatMessage.id_phien == session.id_phien)
            .order_by(desc(LiveChatMessage.thoiGianGui))
            .first()
        )
        # Số tin nhắn chưa đọc (logic đơn giản: đếm tin của khách hàng mà nhân viên chưa đọc)
        unread = (
            db.query(func.count(LiveChatMessage.id_tinNhan))
            .filter(
                LiveChatMessage.id_phien == session.id_phien,
                LiveChatMessage.nguoiGui == "khach_hang",
            )
            .scalar() or 0
        )

    return LiveChatSessionResponse(
        id_phien=session.id_phien,
        id_nguoiDung=session.id_nguoiDung,
        tenKhachHang=session.tenKhachHang,
        id_nhanVien=session.id_nhanVien,
        tenNhanVien=session.tenNhanVien,
        trangThai=session.trangThai,
        thoiGianTao=session.thoiGianTao,
        thoiGianDong=session.thoiGianDong,
        lastMessage=last_msg.noiDung[:100] if last_msg else None,
        unreadCount=unread,
    )


# ═══════════════════════════════════════════════════════════════
# REST Endpoints
# ═══════════════════════════════════════════════════════════════

@router.post("/sessions", response_model=LiveChatSessionResponse)
def create_session(body: LiveChatSessionCreate, db: Session = Depends(get_db)):
    """Khách hàng tạo phiên chat mới."""
    new_session = LiveChatSession(tenKhachHang=body.tenKhachHang, trangThai="cho_nhan")
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return _session_to_response(new_session, db)


@router.get("/sessions", response_model=List[LiveChatSessionResponse])
def list_sessions(
    trangThai: Optional[str] = Query(None, description="Lọc theo trạng thái: cho_nhan, dang_chat, da_dong"),
    db: Session = Depends(get_db),
):
    """Lấy danh sách phiên chat (cho nhân viên/admin)."""
    q = db.query(LiveChatSession).order_by(desc(LiveChatSession.thoiGianTao))
    if trangThai:
        q = q.filter(LiveChatSession.trangThai == trangThai)
    sessions = q.all()
    return [_session_to_response(s, db) for s in sessions]


@router.get("/sessions/{id_phien}", response_model=LiveChatSessionResponse)
def get_session(id_phien: str, db: Session = Depends(get_db)):
    """Lấy chi tiết một phiên chat."""
    session = db.query(LiveChatSession).filter(LiveChatSession.id_phien == id_phien).first()
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên chat")
    return _session_to_response(session, db)


@router.put("/sessions/{id_phien}/accept", response_model=LiveChatSessionResponse)
async def accept_session(
    id_phien: str,
    id_nhanVien: int = Query(..., description="ID của nhân viên nhận chat"),
    db: Session = Depends(get_db),
):
    """Nhân viên nhấn tiếp nhận phiên chat."""
    session = db.query(LiveChatSession).filter(LiveChatSession.id_phien == id_phien).first()
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên chat")
    if session.trangThai != "cho_nhan":
        raise HTTPException(status_code=400, detail="Phiên chat đã được tiếp nhận hoặc đã đóng")

    # Lấy thông tin nhân viên
    nhan_vien = db.query(NguoiDung).filter(NguoiDung.id_nguoiDung == id_nhanVien).first()
    if not nhan_vien:
        raise HTTPException(status_code=400, detail="Không tìm thấy nhân viên")

    session.id_nhanVien = id_nhanVien
    session.tenNhanVien = nhan_vien.hoTen
    session.trangThai = "dang_chat"
    db.commit()
    db.refresh(session)

    await livechat_manager.send_to_session(
        id_phien,
        {
            "type": "status_change",
            "data": {"trangThai": "dang_chat", "tenNhanVien": nhan_vien.hoTen}
        }
    )

    return _session_to_response(session, db)


@router.put("/sessions/{id_phien}/close", response_model=LiveChatSessionResponse)
async def close_session(id_phien: str, db: Session = Depends(get_db)):
    """Đóng phiên chat."""
    session = db.query(LiveChatSession).filter(LiveChatSession.id_phien == id_phien).first()
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên chat")

    session.trangThai = "da_dong"
    session.thoiGianDong = datetime.utcnow()
    db.commit()
    db.refresh(session)

    await livechat_manager.send_to_session(
        id_phien,
        {
            "type": "status_change",
            "data": {"trangThai": "da_dong"}
        }
    )

    return _session_to_response(session, db)


@router.get("/sessions/{id_phien}/messages", response_model=List[LiveChatMessageResponse])
def get_messages(id_phien: str, db: Session = Depends(get_db)):
    """Lấy lịch sử tin nhắn của một phiên chat."""
    session = db.query(LiveChatSession).filter(LiveChatSession.id_phien == id_phien).first()
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên chat")

    messages = (
        db.query(LiveChatMessage)
        .filter(LiveChatMessage.id_phien == id_phien)
        .order_by(LiveChatMessage.thoiGianGui.asc())
        .all()
    )
    return messages


@router.post("/sessions/{id_phien}/messages", response_model=LiveChatMessageResponse)
def send_message_rest(
    id_phien: str,
    body: LiveChatMessageCreate,
    nguoiGui: str = Query(..., description="khach_hang hoặc nhan_vien"),
    tenNguoiGui: str = Query(..., description="Tên hiển thị người gửi"),
    id_nguoiGui: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Gửi tin nhắn qua REST (fallback khi WebSocket không dùng được)."""
    session = db.query(LiveChatSession).filter(LiveChatSession.id_phien == id_phien).first()
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên chat")
    if session.trangThai == "da_dong":
        raise HTTPException(status_code=400, detail="Phiên chat đã đóng")

    msg = LiveChatMessage(
        id_phien=id_phien,
        nguoiGui=nguoiGui,
        id_nguoiGui=id_nguoiGui,
        tenNguoiGui=tenNguoiGui,
        noiDung=body.noiDung,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return msg


# ═══════════════════════════════════════════════════════════════
# WebSocket Endpoint
# ═══════════════════════════════════════════════════════════════

@router.websocket("/ws/{token}/{id_phien}")
async def livechat_websocket(websocket: WebSocket, token: str, id_phien: str, role: str = "khach_hang", db: Session = Depends(get_db)):
    """
    WebSocket cho live chat.
    Client kết nối với token JWT để xác thực và id_phien để vào đúng phòng chat.
    """
    session = db.query(LiveChatSession).filter(LiveChatSession.id_phien == id_phien).first()
    if not session:
        await websocket.close(code=1008)
        return

    if token == "guest":
        user_id = 0
        ho_ten = session.tenKhachHang
        is_staff = False
    else:
        user = get_user_from_token(token, db)
        if not user:
            await websocket.close(code=1008)
            return
        user_id = user.id_nguoiDung
        ho_ten = user.hoTen
        is_staff = user.id_vaiTro in [2, 4]

    # Kết nối
    await livechat_manager.connect(websocket, user_id, id_phien)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg_data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            if msg_data.get("type") == "message":
                noi_dung = msg_data.get("noiDung", "").strip()
                if not noi_dung:
                    continue
                if session.trangThai == "da_dong":
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "data": {"message": "Phiên chat đã đóng"}
                    }))
                    continue

                # Xác định người gửi
                is_staff_role = (role == "nhan_vien")
                is_user_staff = is_staff # from connection setup
                
                # Chi cho phep gui voi tu cach staff neu that su la staff va ket noi tu widget staff
                if is_staff_role and is_user_staff:
                    nguoi_gui = "nhan_vien"
                else:
                    nguoi_gui = "khach_hang"

                # Lưu tin nhắn
                new_msg = LiveChatMessage(
                    id_phien=id_phien,
                    nguoiGui=nguoi_gui,
                    id_nguoiGui=user_id if user_id != 0 else None,
                    tenNguoiGui=ho_ten,
                    noiDung=noi_dung,
                )
                db.add(new_msg)
                db.commit()
                db.refresh(new_msg)

                # Broadcast đến tất cả người trong session (trừ người gửi)
                await livechat_manager.send_to_session(
                    id_phien,
                    {
                        "type": "message",
                        "id_phien": id_phien,
                        "data": {
                            "id_tinNhan": new_msg.id_tinNhan,
                            "nguoiGui": new_msg.nguoiGui,
                            "id_nguoiGui": new_msg.id_nguoiGui,
                            "tenNguoiGui": new_msg.tenNguoiGui,
                            "noiDung": new_msg.noiDung,
                            "thoiGianGui": new_msg.thoiGianGui.isoformat() if new_msg.thoiGianGui else None,
                        },
                    },
                    exclude_user=user_id,
                )

            elif msg_data.get("type") == "typing":
                await livechat_manager.send_to_session(
                    id_phien,
                    {"type": "typing", "id_phien": id_phien, "data": {"userId": user_id}},
                    exclude_user=user_id,
                )

    except WebSocketDisconnect:
        livechat_manager.disconnect(websocket)
