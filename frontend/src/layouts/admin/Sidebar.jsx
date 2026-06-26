import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Users, ClipboardList, ShoppingBag, Utensils, ListTree, LayoutGrid, Star } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

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
  );
};

export default Sidebar;
