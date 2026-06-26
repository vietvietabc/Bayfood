import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Bot, X, Send, RefreshCw, ChevronDown, Sparkles, Utensils, CalendarDays, Clock, HelpCircle } from 'lucide-react';
import axios from '../../utils/axiosSetup';
import './ChatWidget.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* ── Quick suggestion chips ── */
const QUICK_SUGGESTIONS = [
  { icon: <HelpCircle size={13} />, label: 'Hướng dẫn sử dụng', message: 'Hướng dẫn tôi cách đặt bàn và gọi món trên website.' },
  { icon: <Utensils size={13} />, label: 'Xem thực đơn', message: 'Cho tôi xem thực đơn có những món gì?' },
  { icon: <Sparkles size={13} />, label: 'Món hot nhất', message: 'Món nào được yêu thích nhất ở nhà hàng?' },
  { icon: <CalendarDays size={13} />, label: 'Đặt bàn', message: 'Tôi muốn đặt bàn, hướng dẫn tôi nhé?' },
];

/* ── Simple markdown parser ── */
function renderMarkdown(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let listBuffer = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="cb-md-list">
          {listBuffer.map((item, i) => <li key={i}>{parseInline(item)}</li>)}
        </ul>
      );
      listBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const bulletMatch = line.match(/^\s*[-•*]\s+(.*)/);
    const numberedMatch = line.match(/^\s*\d+[.)]\s+(.*)/);

    if (bulletMatch || numberedMatch) {
      listBuffer.push(bulletMatch ? bulletMatch[1] : numberedMatch[1]);
    } else {
      flushList();
      if (line.trim() === '') {
        // skip empty lines
      } else {
        elements.push(<p key={`p-${i}`} className="cb-md-p">{parseInline(line)}</p>);
      }
    }
  }
  flushList();

  return elements;
}

function parseInline(text) {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

/* ── Welcome message ── */
const WELCOME_MSG = {
  id_tinNhan: 'welcome',
  nguoiGui: 'he_thong',
  noiDung: 'Chào bạn! 👋 Tôi là trợ lý AI của **BayFood**.\n\nTôi có thể giúp bạn:\n- Xem thực đơn & gợi ý món ngon\n- Thông tin đặt bàn & giờ mở cửa\n- Giải đáp mọi thắc mắc về nhà hàng\n\nBạn cần tôi hỗ trợ gì nào? 😊',
  thoiGianGui: new Date().toISOString()
};

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize session
  useEffect(() => {
    const savedSessionId = localStorage.getItem('bayfood_chat_session');
    if (savedSessionId) {
      setSessionId(savedSessionId);
      fetchChatHistory(savedSessionId);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollBtn(distanceFromBottom > 120);
  }, []);

  const createNewSession = async () => {
    try {
      setIsLoading(true);
      const res = await axios.post(`${API_URL}/chatbot/sessions`);
      const newSessionId = res.data.id_phien;
      setSessionId(newSessionId);
      localStorage.setItem('bayfood_chat_session', newSessionId);
      setMessages([{ ...WELCOME_MSG, thoiGianGui: new Date().toISOString() }]);
      setHasInteracted(false);
    } catch (error) {
      console.error("Lỗi tạo phiên chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChatHistory = async (sid) => {
    try {
      const res = await axios.get(`${API_URL}/chatbot/sessions/${sid}/messages`);
      if (res.data && res.data.length > 0) {
        setMessages(res.data);
        setHasInteracted(true);
      } else {
        setMessages([{ ...WELCOME_MSG, thoiGianGui: new Date().toISOString() }]);
        setHasInteracted(false);
      }
    } catch (error) {
      console.error("Lỗi lấy lịch sử chat:", error);
      if (error.response && error.response.status === 404) {
        localStorage.removeItem('bayfood_chat_session');
        setSessionId(null);
      }
    }
  };

  const toggleChat = () => {
    if (!isOpen && !sessionId) {
      createNewSession();
    }
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  };

  const resetChat = () => {
    localStorage.removeItem('bayfood_chat_session');
    setHasInteracted(false);
    createNewSession();
  };

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    const userMessage = text.trim();
    setInputValue('');
    setHasInteracted(true);

    const tempUserMsg = {
      id_tinNhan: Date.now(),
      nguoiGui: 'khach_hang',
      noiDung: userMessage,
      thoiGianGui: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const res = await axios.post(`${API_URL}/chatbot/sessions/${sessionId}/messages`, {
        noiDung: userMessage
      });
      setMessages(prev => [...prev, res.data]);
    } catch (error) {
      console.error("Lỗi gửi tin nhắn:", error);
      setMessages(prev => [...prev, {
        id_tinNhan: Date.now() + 1,
        nguoiGui: 'he_thong',
        noiDung: 'Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau nhé! 😊',
        thoiGianGui: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleChipClick = (msg) => {
    sendMessage(msg);
  };

  // Show quick chips only when there's just the welcome message and user hasn't interacted
  const showChips = !hasInteracted && messages.length <= 1;

  return (
    <div className="cb-container">
      {/* Toggle Button */}
      <button
        className={`cb-toggle ${isOpen ? 'cb-toggle--open' : ''}`}
        onClick={toggleChat}
        aria-label="Toggle chat"
      >
        <span className={`cb-toggle__icon ${isOpen ? 'cb-toggle__icon--close' : 'cb-toggle__icon--chat'}`}>
          {isOpen ? <X size={22} /> : <Bot size={26} />}
        </span>
        {!isOpen && (
          <span className="cb-toggle__pulse" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="cb-window">
          {/* Header */}
          <div className="cb-header">
            <div className="cb-header__left">
              <div className="cb-avatar">
                <span className="cb-avatar__emoji">🍽️</span>
              </div>
              <div className="cb-header__info">
                <h3 className="cb-header__title">BayFood AI</h3>
                <span className="cb-header__status">
                  <span className="cb-status-dot" />
                  Trực tuyến
                </span>
              </div>
            </div>
            <div className="cb-header__actions">
              <button onClick={resetChat} title="Bắt đầu đoạn chat mới" className="cb-icon-btn">
                <RefreshCw size={16} />
              </button>
              <button onClick={() => setIsOpen(false)} title="Đóng" className="cb-icon-btn">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            className="cb-messages"
            ref={messagesContainerRef}
            onScroll={handleScroll}
          >
            {messages.map((msg, idx) => (
              <div
                key={msg.id_tinNhan || idx}
                className={`cb-msg ${msg.nguoiGui === 'khach_hang' ? 'cb-msg--user' : 'cb-msg--ai'}`}
                style={{ animationDelay: `${Math.min(idx * 0.05, 0.3)}s` }}
              >
                {msg.nguoiGui === 'he_thong' && (
                  <div className="cb-msg__avatar">🍽️</div>
                )}
                <div className="cb-msg__content">
                  <div className={`cb-bubble ${msg.nguoiGui === 'khach_hang' ? 'cb-bubble--user' : 'cb-bubble--ai'}`}>
                    {msg.nguoiGui === 'he_thong' ? renderMarkdown(msg.noiDung) : msg.noiDung}
                  </div>
                  <div className="cb-msg__time">
                    {new Date(msg.thoiGianGui).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="cb-msg cb-msg--ai">
                <div className="cb-msg__avatar">🍽️</div>
                <div className="cb-msg__content">
                  <div className="cb-bubble cb-bubble--ai cb-typing">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}

            {/* Quick Suggestion Chips */}
            {showChips && !isLoading && (
              <div className="cb-chips">
                {QUICK_SUGGESTIONS.map((chip, i) => (
                  <button
                    key={i}
                    className="cb-chip"
                    onClick={() => handleChipClick(chip.message)}
                    style={{ animationDelay: `${0.4 + i * 0.08}s` }}
                  >
                    {chip.icon}
                    {chip.label}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom button */}
          {showScrollBtn && (
            <button className="cb-scroll-btn" onClick={scrollToBottom} aria-label="Cuộn xuống">
              <ChevronDown size={18} />
            </button>
          )}

          {/* Input Area */}
          <form className="cb-input" onSubmit={handleSendMessage}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Nhập câu hỏi của bạn..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="cb-send"
              aria-label="Gửi"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
