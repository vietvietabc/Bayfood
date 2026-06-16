import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const NotificationBell = ({ colorScheme = 'dark' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const [notiRes, countRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/thongbao/me`),
        axios.get(`${BASE_URL}/api/thongbao/me/unread-count`),
      ]);
      setNotifications(notiRes.data || []);
      setUnreadCount(countRes.data?.count || 0);
    } catch (e) {
      console.error('Lỗi tải thông báo:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user, location.pathname]);

  // Handle incoming WS messages
  useWebSocket((newNoti) => {
    if (newNoti && newNoti.type === 'NEW_NOTIFICATION') {
      setNotifications(prev => [newNoti, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Optional: Play a tiny sound or show a toast here if you want
      // For now, it just updates the bell icon in real time
    }
  });

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleRead = async (id, lienKet) => {
    try {
      await axios.put(`${BASE_URL}/api/thongbao/${id}/read`);
      await fetchNotifications();
      setOpen(false);
      if (lienKet) navigate(lienKet);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReadAll = async () => {
    try {
      await axios.put(`${BASE_URL}/api/thongbao/me/read-all`);
      await fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  // Color tokens based on scheme
  const isDark = colorScheme === 'dark';
  const btnBorder = isDark ? 'rgba(255,255,255,0.15)' : 'var(--border)';
  const btnBg = isDark ? 'rgba(255,255,255,0.06)' : 'transparent';
  const btnColor = isDark ? 'rgba(255,255,255,0.7)' : 'var(--text-main)';

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.4rem 0.85rem',
          borderRadius: '999px',
          border: `1px solid ${btnBorder}`,
          background: btnBg,
          color: btnColor,
          fontSize: '0.82rem',
          fontWeight: '600',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.2s',
        }}
      >
        <Bell size={15} />
        Thông báo
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-6px', right: '-6px',
            background: 'var(--danger)', color: '#fff',
            borderRadius: '50%', minWidth: '18px', height: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.68rem', fontWeight: 'bold', padding: '0 3px',
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 0.65rem)', right: 0,
          width: '360px', maxWidth: 'calc(100vw - 2rem)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '1rem',
          boxShadow: '0 24px 50px rgba(0,0,0,0.25)',
          padding: '0.75rem',
          zIndex: 200,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0.25rem 0.75rem', borderBottom: '1px solid var(--border)', marginBottom: '0.75rem' }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Thông báo</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ color: '#f97316', fontSize: '0.78rem', fontWeight: 'bold' }}>{unreadCount} chưa đọc</div>
              {unreadCount > 0 && (
                <button 
                  onClick={handleReadAll}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Đánh dấu đã xem tất cả
                </button>
              )}
            </div>
          </div>

          {notifications.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '0.75rem', textAlign: 'center' }}>
              Chưa có thông báo nào.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.5rem', maxHeight: '420px', overflowY: 'auto' }}>
              {notifications.slice(0, 50).map((n) => (
                <div key={n.id_thongBao} style={{
                  padding: '0.75rem', borderRadius: '0.75rem',
                  border: n.daDoc ? '1px solid var(--border)' : '1px solid rgba(249,115,22,0.35)',
                  background: n.daDoc ? 'var(--surface-light)' : 'rgba(249,115,22,0.08)',
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.88rem' }}>{n.tieuDe}</div>
                  <div style={{ color: '#a1a1aa', fontSize: '0.82rem', marginBottom: '0.6rem', lineHeight: 1.4 }}>{n.noiDung}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ color: '#a1a1aa', fontSize: '0.72rem' }}>
                      {n.thoiGianTao ? new Date(n.thoiGianTao).toLocaleString('vi-VN') : ''}
                    </div>
                    {!n.daDoc ? (
                      <button
                        onClick={() => handleRead(n.id_thongBao, n.lienKet)}
                        className="btn btn-outline"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <CheckCheck size={13} /> Đã đọc
                      </button>
                    ) : (
                      <button
                        onClick={() => n.lienKet && navigate(n.lienKet)}
                        className="btn btn-outline"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                      >
                        Xem
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
