import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Users, ClipboardList, ShoppingBag, LogOut, Utensils, ListTree, LayoutGrid, Star, Bell, CheckCheck } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const BASE_URL = 'http://localhost:8000';

const AdminLayout = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const [notificationRes, unreadCountRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/thongbao/me`),
          axios.get(`${BASE_URL}/api/thongbao/me/unread-count`),
        ]);

        setNotifications(notificationRes.data || []);
        setUnreadCount(unreadCountRes.data?.count || 0);
      } catch (error) {
        console.error('Failed to load admin notifications', error);
      }
    };

    fetchNotifications();
  }, [location.pathname]);

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      await axios.put(`${BASE_URL}/api/thongbao/${notificationId}/read`);
      const [notificationRes, unreadCountRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/thongbao/me`),
        axios.get(`${BASE_URL}/api/thongbao/me/unread-count`),
      ]);

      setNotifications(notificationRes.data || []);
      setUnreadCount(unreadCountRes.data?.count || 0);
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const navItems = [
    { path: '/admin', icon: <LayoutDashboard size={20} />, label: 'Tổng Quan' },
    { path: '/admin/tables', icon: <LayoutGrid size={20} />, label: 'Cập nhật sơ đồ bàn' },
    { path: '/admin/reservations', icon: <CalendarDays size={20} />, label: 'Cập nhật đặt bàn' },
    { path: '/admin/categories', icon: <ListTree size={20} />, label: 'Cập nhật danh mục' },
    { path: '/admin/menu', icon: <ClipboardList size={20} />, label: 'Cập nhật thực đơn' },
    { path: '/admin/orders', icon: <ShoppingBag size={20} />, label: 'Cập nhật đơn hàng' },
    { path: '/admin/users', icon: <Users size={20} />, label: 'Cập nhật tài khoản' },
    { path: '/admin/reviews', icon: <Star size={20} />, label: 'Cập nhật đánh giá' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface-light)' }}>
      {/* Sidebar */}
      <aside style={{ width: '260px', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'var(--text)' }}>
            <Utensils size={28} color="var(--primary)" />
            <h1 className="text-gradient" style={{ fontSize: '1.5rem', margin: 0 }}>BayFood Admin</h1>
          </Link>
        </div>

        <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem',
                  borderRadius: '0.5rem', textDecoration: 'none',
                  color: isActive ? 'white' : 'var(--text-muted)',
                  background: isActive ? 'var(--primary)' : 'transparent',
                  fontWeight: isActive ? 'bold' : 'normal',
                  transition: 'all 0.2s ease'
                }}
              >
                {item.icon} {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '0.75rem', background: 'var(--surface-light)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                <Bell size={18} color="var(--primary)" /> Thông báo
              </div>
              <span style={{ padding: '0.25rem 0.6rem', borderRadius: '999px', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                {unreadCount}
              </span>
            </div>

            {notifications.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Chưa có thông báo mới.</div>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                {notifications.slice(0, 3).map((notification) => (
                  <div key={notification.id_thongBao} style={{ padding: '0.75rem', borderRadius: '0.6rem', border: '1px solid var(--border)', background: notification.daDoc ? 'white' : 'rgba(249, 115, 22, 0.08)' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 'bold', marginBottom: '0.2rem' }}>{notification.tieuDe}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.45rem' }}>{notification.noiDung}</div>
                    {!notification.daDoc && (
                      <button
                        type="button"
                        onClick={() => handleMarkNotificationRead(notification.id_thongBao)}
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <CheckCheck size={14} /> Đã đọc
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '32px', height: '32px', background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {user?.hoTen?.charAt(0) || 'A'}
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>{user?.hoTen || 'Quản trị viên'}</div>
          </div>
          <button onClick={() => { logout(); window.location.href = '/login'; }} className="btn btn-outline w-full flex items-center justify-center gap-2" style={{ padding: '0.5rem' }}>
            <LogOut size={18} /> Đăng Xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
