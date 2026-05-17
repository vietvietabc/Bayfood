import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Users, ClipboardList, ShoppingBag, LogOut, Utensils, ListTree, LayoutGrid, Star, Clock3, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';

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

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>

      {/* Sidebar */}
      <aside style={{
        width: '260px', flexShrink: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <Utensils size={26} color="var(--primary)" />
            <span className="text-gradient" style={{ fontSize: '1.3rem', fontWeight: '800' }}>BayFood</span>
          </Link>
        </div>

        <nav style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', borderRadius: '0.5rem', textDecoration: 'none',
                color: isActive ? '#fff' : 'var(--text-muted)',
                background: isActive ? 'var(--primary)' : 'transparent',
                fontWeight: isActive ? '700' : '400',
                fontSize: '0.9rem',
                transition: 'all 0.2s ease',
              }}>
                {item.icon} {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Right side: header + content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Top header — same style as KitchenNavbar */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 50, flexShrink: 0,
          background: 'rgba(17,24,39,0.95)',
          borderBottom: '1px solid rgba(249,115,22,0.2)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 2px 20px rgba(0,0,0,0.4)',
        }}>
          <div style={{ padding: '0 2rem', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

            {/* Left: logo + badge */}
            <Link to="/admin" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(249,115,22,0.35)',
              }}>
                <ShieldCheck size={18} color="#fff" />
              </div>
              <span style={{ fontWeight: '800', fontSize: '1.1rem', color: '#fff', letterSpacing: '-0.02em' }}>
                Bay<span style={{ color: '#f97316' }}>Food</span>
              </span>
              <span style={{
                marginLeft: '0.25rem', padding: '0.15rem 0.6rem', borderRadius: '999px',
                background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)',
                color: '#fb923c', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.05em',
              }}>
                ADMIN
              </span>
            </Link>

            {/* Right: user info + avatar + bell + logout */}
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#fff' }}>{user.hoTen}</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Quản trị viên
                  </div>
                </div>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #374151, #4b5563)',
                  border: '2px solid rgba(249,115,22,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fb923c', fontWeight: '800', fontSize: '0.9rem',
                }}>
                  {user.hoTen?.charAt(0)?.toUpperCase()}
                </div>
                <NotificationBell colorScheme="dark" />
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.4rem 0.85rem', borderRadius: '999px',
                    border: '1px solid rgba(239,68,68,0.35)',
                    background: 'rgba(239,68,68,0.08)',
                    color: '#f87171', fontSize: '0.8rem', fontWeight: '600',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(239,68,68,0.18)';
                    e.currentTarget.style.borderColor = 'rgba(239,68,68,0.6)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
                    e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)';
                  }}
                >
                  <LogOut size={14} /> Đăng xuất
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
