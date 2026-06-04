from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.chatbot import ChatSession, ChatMessage
from app.schemas.chatbot import ChatSessionResponse, ChatMessageCreate, ChatMessageResponse
from app.core.ai_service import generate_chat_response

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

@router.post("/sessions", response_model=ChatSessionResponse)
def create_chat_session(db: Session = Depends(get_db)):
    """Tạo một phiên chat mới cho người dùng (có thể là khách vãng lai)"""
    new_session = ChatSession()
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session

@router.get("/sessions/{id_phien}/messages", response_model=List[ChatMessageResponse])
def get_chat_history(id_phien: str, db: Session = Depends(get_db)):
    """Lấy lịch sử tin nhắn của một phiên chat"""
    session = db.query(ChatSession).filter(ChatSession.id_phien == id_phien).first()
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên chat")
    
    messages = db.query(ChatMessage).filter(ChatMessage.id_phien == id_phien).order_by(ChatMessage.thoiGianGui.asc()).all()
    return messages

@router.post("/sessions/{id_phien}/messages", response_model=ChatMessageResponse)
def send_chat_message(id_phien: str, message: ChatMessageCreate, db: Session = Depends(get_db)):
    """Gửi tin nhắn từ người dùng, gọi AI, và trả về câu trả lời"""
    session = db.query(ChatSession).filter(ChatSession.id_phien == id_phien).first()
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên chat")

    # 1. Lưu tin nhắn của người dùng
    user_msg = ChatMessage(
        id_phien=id_phien,
        nguoiGui="khach_hang",
        noiDung=message.noiDung
    )
    db.add(user_msg)
    db.commit()

    # 2. Lấy toàn bộ lịch sử chat để đưa cho AI (bao gồm cả tin nhắn vừa lưu)
    history = db.query(ChatMessage).filter(ChatMessage.id_phien == id_phien).order_by(ChatMessage.thoiGianGui.asc()).all()
    
    # Do chúng ta lấy toàn bộ history nên nó đã chứa câu hỏi cuối (user_msg). 
    # Nhưng API của Gemini thường nhận history cũ và new_message tách biệt ở hàm start_chat
    # Nên ta sẽ truyền history là các tin trước đó, và new_message là tin hiện tại.
    history_for_ai = history[:-1] if len(history) > 1 else []
    
    # 3. Gọi AI
    ai_response_text = generate_chat_response(db=db, chat_history=history_for_ai, new_message=message.noiDung)
    
    # 4. Lưu tin nhắn của AI
    ai_msg = ChatMessage(
        id_phien=id_phien,
        nguoiGui="he_thong",
        noiDung=ai_response_text
    )
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)

    return ai_msg
