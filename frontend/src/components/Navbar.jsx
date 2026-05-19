import { useEffect, useRef, useState } from 'react';
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
    // Only close if there's significant reason or it's handled by link clicks.
    // Menu state should not be bound directly to location pathname this way to avoid excessive re-renders.
  }, [location]);

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

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Glow-gilded Brand Logo */}
        <Link to="/" className="flex items-center gap-3" style={{ textDecoration: 'none', transition: 'all 0.3s ease' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--brand-lavender) 100%)',
            padding: '0.45rem',
            borderRadius: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(249, 115, 22, 0.35)'
          }}>
            <Utensils size={20} color="#fff" />
          </div>
          <span style={{ 
            background: 'linear-gradient(to right, var(--ink) 30%, var(--muted) 100%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            fontSize: '1.4rem', 
            fontWeight: '800', 
            letterSpacing: '-0.5px' 
          }}>
            BayFood
          </span>
        </Link>

        {/* Elegant Navigation Links */}
        <div className="nav-links flex items-center gap-3">
          <Link to="/menu" className={`nav-link flex items-center gap-2 ${isActive('/menu') ? 'active' : ''}`}>
            <Utensils size={17} /> Thực Đơn
          </Link>
          <Link to="/reservation" className={`nav-link flex items-center gap-2 ${isActive('/reservation') ? 'active' : ''}`}>
            <CalendarDays size={17} /> Đặt Bàn
          </Link>

          {user && (
            <div ref={notificationMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setNotificationMenuOpen((prev) => !prev)}
                className={`nav-link flex items-center gap-2 ${notificationMenuOpen ? 'active' : ''}`}
                style={{ background: "transparent", border: "1px solid transparent", cursor: "pointer", position: 'relative' }}
              >
                <Bell size={17} />
                Thông báo
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '4px',
                    right: '6px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                    color: 'white',
                    borderRadius: '999px',
                    minWidth: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.68rem',
                    fontWeight: '800',
                    padding: '0 4px',
                    boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)',
                    border: '1.5px solid #161719'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationMenuOpen && (
                <div className="nav-dropdown" style={{ width: '360px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0.25rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--ink)' }}>Thông báo</div>
                    <div style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: '600' }}>{unreadCount} chưa đọc</div>
                  </div>

                  {notifications.length === 0 ? (
                    <div style={{ color: 'var(--muted)', fontSize: '0.9rem', padding: '1rem', textAlign: 'center' }}>Chưa có thông báo nào.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: '0.5rem', maxHeight: '340px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                      {notifications.slice(0, 6).map((notification) => (
                        <div
                          key={notification.id_thongBao}
                          style={{
                            padding: '0.75rem',
                            borderRadius: '0.75rem',
                            border: notification.daDoc ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(249, 115, 22, 0.2)',
                            background: notification.daDoc ? 'rgba(255,255,255,0.02)' : 'rgba(249, 115, 22, 0.05)',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--ink)' }}>{notification.tieuDe}</div>
                          <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: '0.6rem', lineHeight: 1.4 }}>{notification.noiDung}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                            <div style={{ color: 'var(--muted-soft)', fontSize: '0.72rem' }}>
                              {notification.thoiGianTao ? new Date(notification.thoiGianTao).toLocaleString('vi-VN') : ''}
                            </div>
                            {!notification.daDoc ? (
                              <button
                                type="button"
                                onClick={() => handleMarkNotificationRead(notification.id_thongBao, notification.lienKet)}
                                className="btn btn-outline"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', borderRadius: '0.5rem' }}
                              >
                                <CheckCheck size={12} /> Đã đọc
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => notification.lienKet && navigate(notification.lienKet)}
                                className="btn btn-outline"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', borderRadius: '0.5rem' }}
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
            <div className="flex items-center" ref={accountMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                className={`nav-link flex items-center gap-2 ${accountMenuOpen ? 'active' : ''}`}
                style={{ background: "transparent", border: "1px solid transparent", cursor: "pointer", fontWeight: '600' }}
              >
                <User size={17} /> {user.hoTen}
                <ChevronDown size={15} style={{ transform: accountMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
              </button>

              {accountMenuOpen && (
                <div className="nav-dropdown" style={{ minWidth: '240px' }}>
                  <div style={{ padding: '0.5rem 0.5rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--ink)', fontSize: '0.95rem' }}>{user.hoTen}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '0.15rem' }}>{user.email}</div>
                  </div>

                  <Link
                    to="/account"
                    className="nav-link flex items-center gap-2"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.65rem 0.5rem',
                      borderRadius: '0.5rem',
                      textDecoration: 'none',
                      fontSize: '0.9rem'
                    }}
                    onClick={() => setAccountMenuOpen(false)}
                  >
                    <LayoutDashboard size={16} /> Xem tài khoản
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      logout();
                    }}
                    className="nav-link flex items-center gap-2"
                    style={{ 
                      width: '100%', 
                      justifyContent: 'flex-start', 
                      padding: '0.65rem 0.5rem', 
                      border: 'none', 
                      background: 'transparent', 
                      color: 'var(--danger)', 
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    <LogOut size={16} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="nav-link flex items-center gap-2">
              <User size={17} /> Đăng Nhập
            </Link>
          )}

          {/* Cart Icon Gilded Button */}
          <button
            onClick={() => navigate('/cart')}
            className={`nav-link flex items-center gap-2 ${isActive('/cart') ? 'active' : ''}`}
            style={{ background: "transparent", border: "1px solid transparent", cursor: "pointer", position: 'relative' }}
          >
            <ShoppingCart size={17} />
            Giỏ Hàng
            {cartCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '4px',
                right: '6px',
                background: 'linear-gradient(135deg, var(--primary) 0%, #c2410c 100%)',
                color: 'white',
                borderRadius: '999px',
                minWidth: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.68rem',
                fontWeight: '800',
                padding: '0 4px',
                boxShadow: '0 0 10px rgba(249, 115, 22, 0.6)',
                border: '1.5px solid #161719'
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
