import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, User } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

const LiveChatWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState('idle'); // idle | cho_nhan | dang_chat | da_dong
  const [staffName, setStaffName] = useState(null);
  const [hasName, setHasName] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const wsRef = useRef(null);
  const hasJoined = useRef(false);

  const reconnectTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const pollTimerRef = useRef(null);
  const lastMsgIdRef = useRef(null);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Polling fallback (khi WS không kết nối được) ────────────────────────────
  const startPolling = useCallback((sid) => {
    if (pollTimerRef.current) return; // already polling
    pollTimerRef.current = setInterval(async () => {
      // Chỉ poll khi WS đang không kết nối
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
      try {
        const res = await axios.get(`${API_URL}/livechat/sessions/${sid}/messages`);
        const msgs = res.data || [];
        setMessages(prev => {
          // Chỉ append tin nhắn mới (không duplicate)
          const existingIds = new Set(prev.map(m => m.id_tinNhan));
          const newMsgs = msgs.filter(m => !existingIds.has(m.id_tinNhan));
          return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev;
        });
      } catch (e) { /* ignore */ }
    }, 3000);
  }, [API_URL]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const connectWebSocket = useCallback((sid) => {
    const token = localStorage.getItem('token') || 'guest';
    if (!sid) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = API_URL.replace(/^http/, 'ws');
    const ws = new WebSocket(`${wsUrl}/livechat/ws/${token}/${sid}?role=khach_hang`);

    ws.onopen = () => {
      console.log('[LiveChat] WebSocket connected');
      hasJoined.current = true;
      reconnectAttemptsRef.current = 0;
      stopPolling(); // WS đã hoạt động → dừng polling
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'message') {
          setMessages(prev => {
            // Tránh duplicate nếu có cả polling + WS cùng lúc
            const exists = prev.some(m => m.id_tinNhan === msg.data.id_tinNhan);
            return exists ? prev : [...prev, msg.data];
          });
        } else if (msg.type === 'status_change') {
          setStatus(msg.data.trangThai || status);
          if (msg.data.tenNhanVien) {
            setStaffName(msg.data.tenNhanVien);
          }
        } else if (msg.type === 'error') {
          console.error('[LiveChat] Error:', msg.data.message);
        }
      } catch (e) {
        console.error('[LiveChat] Parse error:', e);
      }
    };

    ws.onclose = () => {
      console.log('[LiveChat] WebSocket disconnected — bắt đầu polling & reconnect');
      wsRef.current = null;

      // Bắt đầu polling fallback ngay
      startPolling(sid);

      // Auto reconnect với exponential backoff
      const attempts = reconnectAttemptsRef.current;
      if (attempts < 8) {
        const delay = Math.min(1000 * Math.pow(1.5, attempts), 15000);
        reconnectAttemptsRef.current += 1;
        reconnectTimerRef.current = setTimeout(() => {
          console.log(`[LiveChat] Reconnecting... (attempt ${attempts + 1})`);
          connectWebSocket(sid);
        }, delay);
      }
    };

    ws.onerror = (err) => {
      console.error('[LiveChat] WebSocket error:', err);
    };

    wsRef.current = ws;
  }, [API_URL, startPolling, stopPolling]);

  // Dọn dẹp khi unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      stopPolling();
    };
  }, [stopPolling]);

  // Restore session from localStorage
  useEffect(() => {
    const savedSessionId = localStorage.getItem('livechat_session');
    if (savedSessionId) {
      setSessionId(savedSessionId);
      setStatus('cho_nhan');
      setHasName(true);
      startPolling(savedSessionId);   // bắt đầu poll ngay, WS sẽ dừng poll khi kết nối xong
      connectWebSocket(savedSessionId);
      axios.get(`${API_URL}/livechat/sessions/${savedSessionId}/messages`)
        .then(res => setMessages(res.data || []))
        .catch(err => {
          if (err.response && err.response.status === 404) {
            localStorage.removeItem('livechat_session');
            setSessionId(null);
            setStatus('idle');
          }
        });
    }
  }, [connectWebSocket, startPolling]);

  const startChat = async () => {
    if (!hasName) {
      return;
    }
    try {
      const name = user?.hoTen || prompt('Nhập tên của bạn để bắt đầu chat:');
      if (!name || !name.trim()) return;

      const res = await axios.post(`${API_URL}/livechat/sessions`, {
        tenKhachHang: name.trim(),
        id_nguoiDung: user?.id_nguoiDung || null,  // Gán ID nếu đã đăng nhập
      });
      const sid = res.data.id_phien;
      setSessionId(sid);
      localStorage.setItem('livechat_session', sid);
      setStatus('cho_nhan');
      connectWebSocket(sid);
    } catch (err) {
      console.error('Lỗi tạo phiên chat:', err);
    }
  };

  const sendMessage = async () => {
    const text = inputValue.trim();
    if (!text || !sessionId) return;
    const name = user?.hoTen || 'Khách';

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Gửi qua WebSocket
      wsRef.current.send(JSON.stringify({
        type: 'message',
        noiDung: text,
      }));
      setInputValue('');
      setMessages(prev => [...prev, {
        id_tinNhan: Date.now(),
        nguoiGui: 'khach_hang',
        tenNguoiGui: name,
        noiDung: text,
        thoiGianGui: new Date().toISOString()
      }]);
    } else {
      // Fallback: gửi qua REST
      try {
        await axios.post(
          `${API_URL}/livechat/sessions/${sessionId}/messages`,
          { noiDung: text },
          {
            params: {
              nguoiGui: 'khach_hang',
              tenNguoiGui: name,
              id_nguoiGui: user?.id_nguoiDung || null,
            },
          }
        );
        setInputValue('');
        // Refresh messages
        fetchMessages();
      } catch (err) {
        console.error('Lỗi gửi tin nhắn:', err);
      }
    }
  };

  const fetchMessages = async () => {
    if (!sessionId) return;
    try {
      const res = await axios.get(`${API_URL}/livechat/sessions/${sessionId}/messages`);
      setMessages(res.data || []);
    } catch (err) {
      console.error('Lỗi lấy tin nhắn:', err);
      if (err.response && err.response.status === 404) {
        localStorage.removeItem('livechat_session');
        setSessionId(null);
        setStatus('idle');
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleChat = () => {
    if (!isOpen) {
      if (user) {
        setHasName(true);
      }
    }
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  };

  const closeChat = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    localStorage.removeItem('livechat_session');
    setSessionId(null);
    setMessages([]);
    setStatus('idle');
    setStaffName(null);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={toggleChat}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '96px',
          zIndex: 9999,
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          border: 'none',
          background: isOpen ? 'var(--danger)' : 'var(--primary)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-lg)',
          transition: 'transform 0.2s, background 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '88px',
            right: '24px',
            zIndex: 9999,
            width: '380px',
            maxHeight: '520px',
            background: 'var(--surface-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--rounded-xl)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--primary)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span>💬 Chat với nhân viên</span>
            <button
              onClick={toggleChat}
              title="Thu gọn"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: 2,
                display: 'flex',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}>
            {/* Status banner */}
            {status === 'cho_nhan' && (
              <div style={{
                padding: '10px 16px',
                background: 'rgba(245,158,11,0.12)',
                color: '#fbbf24',
                fontSize: '0.8rem',
                textAlign: 'center',
                borderBottom: '1px solid var(--border)',
              }}>
                ⏳ Đang chờ nhân viên tiếp nhận...
              </div>
            )}
            {status === 'dang_chat' && staffName && (
              <div style={{
                padding: '10px 16px',
                background: 'rgba(16,185,129,0.12)',
                color: '#34d399',
                fontSize: '0.8rem',
                textAlign: 'center',
                borderBottom: '1px solid var(--border)',
              }}>
                ✅ {staffName} đang hỗ trợ bạn
              </div>
            )}
            {status === 'da_dong' && (
              <div style={{
                padding: '10px 16px',
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                textAlign: 'center',
                borderBottom: '1px solid var(--border)',
              }}>
                Phiên chat đã kết thúc
              </div>
            )}

            {/* Start screen */}
            {status === 'idle' && (
              <div style={{ padding: '24px 16px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <User size={40} color="var(--muted)" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                  Bạn cần hỗ trợ? Hãy bắt đầu chat với nhân viên của chúng tôi.
                </p>
                <div style={{ marginBottom: '12px' }}>
                  <input
                    type="text"
                    placeholder="Nhập tên của bạn..."
                    value={user?.hoTen || ''}
                    readOnly={!!user?.hoTen}
                    onChange={(e) => {}}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--rounded-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface-soft)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <button
                  onClick={startChat}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 'var(--rounded-md)',
                    border: 'none',
                    background: 'var(--primary)',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  Bắt đầu chat
                </button>
              </div>
            )}

            {/* Messages */}
            {status !== 'idle' && (
              <>
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  minHeight: '200px',
                  maxHeight: '320px',
                }}>
                  {messages.length === 0 && status === 'cho_nhan' && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', marginTop: '20px' }}>
                      Hãy gửi tin nhắn đầu tiên, nhân viên sẽ phản hồi sớm nhất.
                    </p>
                  )}
                  {messages.map((msg, i) => (
                    <div
                      key={msg.id_tinNhan || i}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.nguoiGui === 'khach_hang' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <span style={{
                        fontSize: '0.65rem',
                        color: 'var(--text-muted)',
                        marginBottom: '2px',
                        padding: '0 8px',
                      }}>
                        {msg.tenNguoiGui}
                      </span>
                      <div style={{
                        maxWidth: '85%',
                        padding: '8px 14px',
                        borderRadius: msg.nguoiGui === 'khach_hang'
                          ? '16px 16px 4px 16px'
                          : '16px 16px 16px 4px',
                        background: msg.nguoiGui === 'khach_hang'
                          ? 'var(--primary)'
                          : 'var(--surface-soft)',
                        color: msg.nguoiGui === 'khach_hang' ? '#fff' : 'var(--text-main)',
                        fontSize: '0.85rem',
                        lineHeight: 1.4,
                        wordBreak: 'break-word',
                      }}>
                        {msg.noiDung}
                      </div>
                      {msg.thoiGianGui && (
                        <span style={{
                          fontSize: '0.6rem',
                          color: 'var(--text-muted)',
                          marginTop: '2px',
                          padding: '0 8px',
                        }}>
                          {new Date(msg.thoiGianGui).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                {status !== 'da_dong' && (
                  <div style={{
                    padding: '10px 12px',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    gap: '8px',
                  }}>
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Nhập tin nhắn..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={status === 'da_dong'}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 'var(--rounded-pill)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface-soft)',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!inputValue.trim()}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        border: 'none',
                        background: inputValue.trim() ? 'var(--primary)' : 'var(--surface-soft)',
                        color: inputValue.trim() ? '#fff' : 'var(--text-muted)',
                        cursor: inputValue.trim() ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                )}

                {/* Return to start button */}
                {status === 'da_dong' && (
                  <div style={{
                    padding: '12px',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'center',
                  }}>
                    <button
                      onClick={() => {
                        localStorage.removeItem('livechat_session');
                        setSessionId(null);
                        setMessages([]);
                        setStatus('idle');
                        setStaffName(null);
                      }}
                      style={{
                        padding: '8px 24px',
                        borderRadius: 'var(--rounded-pill)',
                        border: 'none',
                        background: 'var(--primary)',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                      }}
                    >
                      Bắt đầu chat mới
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default LiveChatWidget;
