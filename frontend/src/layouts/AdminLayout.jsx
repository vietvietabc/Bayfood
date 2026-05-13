import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Users, ClipboardList, ShoppingBag, LogOut, Utensils, ListTree, LayoutGrid, Star, Clock3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminLayout = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { path: '/admin', icon: <LayoutDashboard size={20} />, label: 'Tổng Quan' },
    { path: '/admin/tables', icon: <LayoutGrid size={20} />, label: 'Cập nhật sơ đồ bàn' },
    { path: '/admin/reservations', icon: <CalendarDays size={20} />, label: 'Cập nhật đặt bàn' },
    { path: '/admin/categories', icon: <ListTree size={20} />, label: 'Cập nhật danh mục' },
    { path: '/admin/menu', icon: <ClipboardList size={20} />, label: 'Cập nhật thực đơn' },
    { path: '/admin/orders', icon: <ShoppingBag size={20} />, label: 'Cập nhật đơn hàng' },
    { path: '/admin/users', icon: <Users size={20} />, label: 'Cập nhật tài khoản' },
    { path: '/admin/reviews', icon: <Star size={20} />, label: 'Cập nhật đánh giá' },
    { path: '/admin/working-hours', icon: <Clock3 size={20} />, label: 'Giờ làm việc' },
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
