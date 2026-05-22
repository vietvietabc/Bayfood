from fastapi import WebSocket
from typing import Dict, List
import json

class ConnectionManager:
    def __init__(self):
        # Lưu kết nối theo user_id: { user_id: [websocket1, websocket2, ...] }
        self.active_connections_by_user: Dict[int, List[WebSocket]] = {}
        # Lưu kết nối theo role: { role_name: [websocket1, websocket2, ...] }
        self.active_connections_by_role: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int, role_name: str | None = None):
        await websocket.accept()
        
        # Thêm vào danh sách theo user_id
        if user_id not in self.active_connections_by_user:
            self.active_connections_by_user[user_id] = []
        self.active_connections_by_user[user_id].append(websocket)
        
        # Thêm vào danh sách theo role
        if role_name:
            if role_name not in self.active_connections_by_role:
                self.active_connections_by_role[role_name] = []
            self.active_connections_by_role[role_name].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int, role_name: str | None = None):
        # Xóa khỏi danh sách user
        if user_id in self.active_connections_by_user:
            if websocket in self.active_connections_by_user[user_id]:
                self.active_connections_by_user[user_id].remove(websocket)
            if not self.active_connections_by_user[user_id]:
                del self.active_connections_by_user[user_id]
                
        # Xóa khỏi danh sách role
        if role_name and role_name in self.active_connections_by_role:
            if websocket in self.active_connections_by_role[role_name]:
                self.active_connections_by_role[role_name].remove(websocket)
            if not self.active_connections_by_role[role_name]:
                del self.active_connections_by_role[role_name]

    async def send_personal_message(self, message: dict, user_id: int):
        """Gửi tin nhắn cho một người dùng cụ thể"""
        if user_id in self.active_connections_by_user:
            for connection in self.active_connections_by_user[user_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    pass

    async def broadcast_to_role(self, message: dict, role_name: str):
        """Gửi tin nhắn cho tất cả user có một role nhất định (Admin, Bếp, Phục vụ...)"""
        if role_name in self.active_connections_by_role:
            for connection in self.active_connections_by_role[role_name]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    pass

manager = ConnectionManager()
