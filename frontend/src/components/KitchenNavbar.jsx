import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, ChefHat } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const KitchenNavbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(17,24,39,0.95)',
      borderBottom: '1px solid rgba(249,115,22,0.2)',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 2px 20px rgba(0,0,0,0.4)',
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 2rem',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(249,115,22,0.35)',
          }}>
            <ChefHat size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: '800', fontSize: '1.1rem', color: '#fff', letterSpacing: '-0.02em' }}>
            Bay<span style={{ color: '#f97316' }}>Food</span>
          </span>
          <span style={{
            marginLeft: '0.25rem',
            padding: '0.15rem 0.6rem',
            borderRadius: '999px',
            background: 'rgba(249,115,22,0.15)',
            border: '1px solid rgba(249,115,22,0.3)',
            color: '#fb923c',
            fontSize: '0.7rem',
            fontWeight: '700',
            letterSpacing: '0.05em',
          }}>
            KITCHEN
          </span>
        </Link>

        {/* Right side */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* User info */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#fff' }}>{user.hoTen}</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Nhân viên bếp
              </div>
            </div>

            {/* Avatar */}
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #374151, #4b5563)',
              border: '2px solid rgba(249,115,22,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fb923c', fontWeight: '800', fontSize: '0.9rem',
            }}>
              {user.hoTen?.charAt(0)?.toUpperCase()}
            </div>

            {/* Notification Bell */}
            <NotificationBell colorScheme="dark" />

            {/* Logout button */}
            <button
              onClick={handleLogout}
              title="Đăng xuất"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '999px',
                border: '1px solid rgba(239,68,68,0.35)',
                background: 'rgba(239,68,68,0.08)',
                color: '#f87171',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
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
              <LogOut size={14} />
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default KitchenNavbar;
