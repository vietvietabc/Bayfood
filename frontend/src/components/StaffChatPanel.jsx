import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, X, Send, User, Check, Clock, ArrowLeft } from 'lucide-react';
import axios from '../utils/axiosSetup';
import { useAuth } from '../context/AuthContext';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

function formatTime(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

const StaffChatPanel = ({ onClose }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);        // Danh sách session
  const [activeSessionId, setActiveSessionId] = useState(null); // Session đang chat
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const wsRef = useRef(null);
  const pollRef = useRef(null);
  const msgPollRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  // ── Hàm fetch sessions ──
  const fetchSessions = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/livechat/sessions`);
      // Lọc các session cho_nhan hoặc dang_chat
      const active = (res.data || []).filter(s => s.trangThai === 'cho_nhan' || s.trangThai === 'dang_chat');
      setSessions(active);
    } catch (err) {
      console.error('Lỗi lấy danh sách chat:', err);
    }
  }, []);

  // ── Hàm fetch messages ──
  const fetchMessages = useCallback(async (sid) => {
    if (!sid) return;
    try {
      const res = await axios.get(`${API_URL}/livechat/sessions/${sid}/messages`);
      setMessages(res.data || []);
    } catch (err) {
      console.error('Lỗi lấy tin nhắn:', err);
    }
  }, []);

  // ── WebSocket connect ──
  const connectWS = useCallback((sid) => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    const token = localStorage.getItem('token');
    if (!token || !sid) return;

    const wsUrl = API_URL.replace(/^http/, 'ws');
    const ws = new WebSocket(`${wsUrl}/livechat/ws/${token}/${sid}?role=nhan_vien`);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'message') {
          setMessages(prev => [...prev, msg.data]);
        } else if (msg.type === 'status_change') {
          // Cập nhật session status
          setSessions(prev =>
            prev.map(s =>
              s.id_phien === sid
                ? { ...s, trangThai: msg.data.trangThai }
                : s
            )
          );
        }
      } catch (e) {
        console.error(e);
      }
    };

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
      // Dừng poll tin nhắn khi WS hoạt động
      if (msgPollRef.current) { clearInterval(msgPollRef.current); msgPollRef.current = null; }
    };

    ws.onclose = () => {
      wsRef.current = null;
      // Bắt đầu poll tin nhắn khi WS ngắt
      if (sid && !msgPollRef.current) {
        msgPollRef.current = setInterval(() => fetchMessages(sid), 3000);
      }
      // Auto-reconnect
      const attempts = reconnectAttemptsRef.current;
      if (attempts < 6) {
        const delay = Math.min(1000 * Math.pow(1.5, attempts), 12000);
        reconnectAttemptsRef.current += 1;
        reconnectTimerRef.current = setTimeout(() => connectWS(sid), delay);
      }
    };
    wsRef.current = ws;
  }, []);

  // ── Polling mỗi 5 giây ──
  useEffect(() => {
    fetchSessions();
    pollRef.current = setInterval(fetchSessions, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchSessions]);

  // ── Load messages khi chọn session ──
  useEffect(() => {
    if (activeSessionId) {
      fetchMessages(activeSessionId);
      connectWS(activeSessionId);
    }
    return () => {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      if (msgPollRef.current) { clearInterval(msgPollRef.current); msgPollRef.current = null; }
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [activeSessionId, fetchMessages, connectWS]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Actions ──
  const handleAccept = async (sid) => {
    if (!user) return;
    setLoading(true);
    try {
      await axios.put(`${API_URL}/livechat/sessions/${sid}/accept`, null, {
        params: { id_nhanVien: user.id_nguoiDung },
      });
      setActiveSessionId(sid);
      await fetchSessions();
    } catch (err) {
      console.error('Lỗi tiếp nhận:', err);
      alert('Không thể tiếp nhận phiên chat này.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (sid) => {
    try {
      await axios.put(`${API_URL}/livechat/sessions/${sid}/close`);
      setActiveSessionId(null);
      setMessages([]);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      await fetchSessions();
    } catch (err) {
      console.error('Lỗi đóng phiên:', err);
    }
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || !activeSessionId) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', noiDung: text }));
      setInputValue('');
      setMessages(prev => [...prev, {
        id_tinNhan: Date.now(),
        nguoiGui: 'nhan_vien',
        tenNguoiGui: user?.hoTen || 'Nhân viên',
        noiDung: text,
        thoiGianGui: new Date().toISOString()
      }]);
    } else {
      try {
        await axios.post(
          `${API_URL}/livechat/sessions/${activeSessionId}/messages`,
          { noiDung: text },
          {
            params: {
              nguoiGui: 'nhan_vien',
              tenNguoiGui: user?.hoTen || 'Nhân viên',
              id_nguoiGui: user?.id_nguoiDung,
            },
          }
        );
        setInputValue('');
        fetchMessages(activeSessionId);
      } catch (err) {
        console.error('Lỗi gửi:', err);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBack = () => {
    setActiveSessionId(null);
    setMessages([]);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const waitingSessions = sessions.filter(s => s.trangThai === 'cho_nhan');
  const activeMySessions = sessions.filter(
    s => s.trangThai === 'dang_chat' && s.id_nhanVien === user?.id_nguoiDung
  );

  // ── Render ──
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--surface-card)',
      borderLeft: '1px solid var(--border)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        {activeSessionId ? (
          <button
            onClick={handleBack}
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '0.85rem', fontWeight: 600, padding: 0,
            }}
          >
            <ArrowLeft size={16} /> Quay lại
          </button>
        ) : (
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
            💬 Chat khách hàng
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {waitingSessions.length > 0 && (
            <span style={{
              background: 'var(--danger)', color: '#fff',
              fontSize: '0.7rem', fontWeight: 700,
              borderRadius: '50%', width: '20px', height: '20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {waitingSessions.length}
            </span>
          )}
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent', border: 'none',
                color: 'var(--text-muted)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', padding: '2px',
                borderRadius: '4px',
              }}
              title="Đóng"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {!activeSessionId ? (
          /* ── Session list ── */
          <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
            {sessions.length === 0 && (
              <div style={{
                padding: '24px 16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
              }}>
                <MessageSquare size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                Chưa có khách hàng nào cần hỗ trợ
              </div>
            )}

            {/* Waiting sessions */}
            {waitingSessions.map(s => (
              <div
                key={s.id_phien}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--rounded-md)',
                  border: '1px solid rgba(245,158,11,0.35)',
                  background: 'rgba(245,158,11,0.06)',
                  marginBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={16} color="var(--text-muted)" />
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      {s.tenKhachHang}
                    </span>
                    <span style={{
                      fontSize: '0.65rem',
                      padding: '2px 6px',
                      borderRadius: 'var(--rounded-pill)',
                      background: 'rgba(245,158,11,0.18)',
                      color: '#fbbf24',
                    }}>
                      Đang chờ
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    {formatTime(s.thoiGianTao)}
                  </span>
                  <button
                    onClick={() => handleAccept(s.id_phien)}
                    disabled={loading}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--rounded-pill)',
                      border: 'none',
                      background: 'var(--success)',
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Check size={14} /> Tiếp nhận
                  </button>
                </div>
              </div>
            ))}

            {/* Active sessions (của mình) */}
            {activeMySessions.map(s => (
              <div
                key={s.id_phien}
                onClick={() => setActiveSessionId(s.id_phien)}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--rounded-md)',
                  border: '1px solid rgba(16,185,129,0.25)',
                  background: 'rgba(16,185,129,0.05)',
                  marginBottom: '8px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={16} color="var(--text-muted)" />
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      {s.tenKhachHang}
                    </span>
                    <span style={{
                      fontSize: '0.65rem',
                      padding: '2px 6px',
                      borderRadius: 'var(--rounded-pill)',
                      background: 'rgba(16,185,129,0.18)',
                      color: '#34d399',
                    }}>
                      Đang chat
                    </span>
                  </div>
                </div>
                {s.lastMessage && (
                  <p style={{
                    margin: 0,
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '200px',
                  }}>
                    {s.lastMessage}
                  </p>
                )}
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  {formatTime(s.thoiGianTao)}
                </span>
              </div>
            ))}

            {/* Active sessions (của người khác) - hiển thị nhẹ */}
            {sessions
              .filter(s => s.trangThai === 'dang_chat' && s.id_nhanVien !== user?.id_nguoiDung)
              .map(s => (
                <div
                  key={s.id_phien}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--rounded-md)',
                    marginBottom: '4px',
                    opacity: 0.5,
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {s.tenKhachHang} — đang chat với {s.tenNhanVien}
                  </span>
                </div>
              ))}
          </div>
        ) : (
          /* ── Chat view ── */
          <>
            {/* Chat header */}
            {(() => {
              const sess = sessions.find(s => s.id_phien === activeSessionId);
              return (
                <div style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--surface-soft)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    {sess?.tenKhachHang || 'Khách hàng'}
                  </span>
                  <button
                    onClick={() => handleClose(activeSessionId)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--rounded-pill)',
                      border: '1px solid var(--danger)',
                      background: 'rgba(239,68,68,0.08)',
                      color: '#f87171',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Kết thúc
                  </button>
                </div>
              );
            })()}

            {/* Messages — cuộn giống Messenger */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              minHeight: 0,
              scrollBehavior: 'smooth',
            }}>
              {messages.map((msg, i) => (
                <div
                  key={msg.id_tinNhan || i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.nguoiGui === 'nhan_vien' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <span style={{
                    fontSize: '0.6rem',
                    color: 'var(--text-muted)',
                    marginBottom: '2px',
                    padding: '0 6px',
                  }}>
                    {msg.tenNguoiGui}
                  </span>
                  <div style={{
                    maxWidth: '85%',
                    padding: '8px 14px',
                    borderRadius: msg.nguoiGui === 'nhan_vien'
                      ? '16px 16px 4px 16px'
                      : '16px 16px 16px 4px',
                    background: msg.nguoiGui === 'nhan_vien'
                      ? 'var(--primary)'
                      : 'var(--surface-soft)',
                    color: msg.nguoiGui === 'nhan_vien' ? '#fff' : 'var(--text-main)',
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
                      padding: '0 6px',
                    }}>
                      {formatTime(msg.thoiGianGui)}
                    </span>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
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
                onClick={handleSend}
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
          </>
        )}
      </div>
    </div>
  );
};

export default StaffChatPanel;
