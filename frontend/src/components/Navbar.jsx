import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Utensils, CalendarDays, User, LogOut, LayoutDashboard, ChevronDown, Bell, CheckCheck } from 'lucide-react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const Navbar = () => {
  const { cartCount } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const notificationMenuRef = useRef(null);
  const accountMenuRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  useEffect(() => {
    setAccountMenuOpen(false);
    setNotificationMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target)) {
        setNotificationMenuOpen(false);
      }

      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      try {
        const [notificationRes, unreadCountRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/thongbao/me`),
          axios.get(`${BASE_URL}/api/thongbao/me/unread-count`),
        ]);

        setNotifications(notificationRes.data || []);
        setUnreadCount(unreadCountRes.data?.count || 0);
      } catch (error) {
        console.error('Failed to load notifications', error);
      }
    };

    fetchNotifications();
  }, [user, location.pathname]);

  const handleMarkNotificationRead = async (notificationId, lienKet) => {
    try {
      await axios.put(`${BASE_URL}/api/thongbao/${notificationId}/read`);
      const [notificationRes, unreadCountRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/thongbao/me`),
        axios.get(`${BASE_URL}/api/thongbao/me/unread-count`),
      ]);

      setNotifications(notificationRes.data || []);
      setUnreadCount(unreadCountRes.data?.count || 0);
      setNotificationMenuOpen(false);

      if (lienKet) {
        navigate(lienKet);
      }
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
          <Utensils size={28} color="var(--primary)" />
          <h1 className="text-gradient" style={{ fontSize: '1.5rem', margin: 0 }}>BayFood</h1>
        </Link>

        <div className="nav-links flex items-center gap-8">
          <Link to="/menu" className="nav-link flex items-center gap-2">
            <Utensils size={18} /> Thực Đơn
          </Link>
          <Link to="/reservation" className="nav-link flex items-center gap-2">
            <CalendarDays size={18} /> Đặt Bàn
          </Link>

          {user && (
            <div ref={notificationMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setNotificationMenuOpen((prev) => !prev)}
                className="btn btn-outline flex items-center gap-2"
                style={{ padding: '0.5rem 1rem', position: 'relative' }}
              >
                <Bell size={18} />
                Thông báo
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: 'var(--danger)',
                    color: 'white',
                    borderRadius: '50%',
                    minWidth: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    padding: '0 4px'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 0.75rem)',
                  right: 0,
                  width: '360px',
                  maxWidth: 'calc(100vw - 2rem)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '1rem',
                  boxShadow: '0 24px 50px rgba(0,0,0,0.18)',
                  padding: '0.75rem',
                  zIndex: 70,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0.25rem 0.75rem', borderBottom: '1px solid var(--border)', marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 'bold' }}>Thông báo</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{unreadCount} chưa đọc</div>
                  </div>

                  {notifications.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '0.75rem' }}>Chưa có thông báo nào.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: '0.5rem', maxHeight: '340px', overflowY: 'auto' }}>
                      {notifications.slice(0, 6).map((notification) => (
                        <div
                          key={notification.id_thongBao}
                          style={{
                            padding: '0.75rem',
                            borderRadius: '0.75rem',
                            border: notification.daDoc ? '1px solid var(--border)' : '1px solid rgba(249, 115, 22, 0.35)',
                            background: notification.daDoc ? 'var(--surface-light)' : 'rgba(249, 115, 22, 0.08)',
                          }}
                        >
                          <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.92rem' }}>{notification.tieuDe}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginBottom: '0.6rem', lineHeight: 1.45 }}>{notification.noiDung}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                              {notification.thoiGianTao ? new Date(notification.thoiGianTao).toLocaleString('vi-VN') : ''}
                            </div>
                            {!notification.daDoc ? (
                              <button
                                type="button"
                                onClick={() => handleMarkNotificationRead(notification.id_thongBao, notification.lienKet)}
                                className="btn btn-outline"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                              >
                                <CheckCheck size={14} /> Đã đọc
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => notification.lienKet && navigate(notification.lienKet)}
                                className="btn btn-outline"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
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
          )}

          {user ? (
            <div className="flex items-center gap-4" ref={accountMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                className="btn btn-outline flex items-center gap-2"
                style={{ padding: '0.5rem 1rem', fontWeight: 'bold', position: 'relative' }}
              >
                <User size={18} /> {user.hoTen}
                <ChevronDown size={16} style={{ transform: accountMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
              </button>

              {accountMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 0.75rem)',
                    right: 0,
                    minWidth: '240px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '1rem',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
                    padding: '0.5rem',
                    zIndex: 50,
                  }}
                >
                  <div style={{ padding: '0.75rem 0.75rem 0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--text)' }}>{user.hoTen}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{user.email}</div>
                  </div>

                  <Link
                    to="/account"
                    className="nav-link flex items-center gap-2"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      borderRadius: '0.75rem',
                      textDecoration: 'none',
                    }}
                    onClick={() => setAccountMenuOpen(false)}
                  >
                    <LayoutDashboard size={18} /> Xem tài khoản
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      logout();
                    }}
                    className="btn btn-outline flex items-center gap-2"
                    style={{ width: '100%', justifyContent: 'flex-start', padding: '0.75rem', border: 'none', background: 'transparent', color: 'var(--danger)' }}
                  >
                    <LogOut size={18} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-outline flex items-center gap-2" style={{ padding: '0.5rem 1rem' }}>
              <User size={18} /> Đăng Nhập
            </Link>
          )}

          <button
            onClick={() => navigate('/cart')}
            className="btn btn-primary flex items-center gap-2"
            style={{ position: 'relative' }}
          >
            <ShoppingCart size={18} />
            Giỏ Hàng
            {cartCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                background: 'var(--danger)',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 'bold'
              }}>
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
