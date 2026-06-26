import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, MessageSquare, LogOut } from 'lucide-react';
import NotificationBell from '../../components/NotificationBell';

const Header = ({ user, handleLogout, showChatPanel, setShowChatPanel }) => {
  return (
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
            <button
              onClick={() => setShowChatPanel(!showChatPanel)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '36px', height: '36px', borderRadius: '50%',
                border: '1px solid var(--border)',
                background: showChatPanel ? 'var(--primary)' : 'transparent',
                color: showChatPanel ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              title="Chat với khách hàng"
            >
              <MessageSquare size={18} />
            </button>
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
  );
};

export default Header;
