import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StaffChatPanel from '../components/StaffChatPanel';
import Sidebar from './admin/Sidebar';
import Header from './admin/Header';

const AdminLayout = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showChatPanel, setShowChatPanel] = useState(false);


  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top header — same style as KitchenNavbar */}
        <Header 
          user={user} 
          handleLogout={handleLogout} 
          showChatPanel={showChatPanel} 
          setShowChatPanel={setShowChatPanel} 
        />

        {/* Main Content */}
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          <Outlet />
        </main>

        {/* Chat Panel — fixed overlay từ phải, như Messenger */}
        <div style={{
          position: 'fixed',
          top: '60px',
          right: showChatPanel ? '0' : '-380px',
          width: '360px',
          height: 'calc(100vh - 60px)',
          zIndex: 200,
          transition: 'right 0.3s cubic-bezier(0.32,0.72,0,1)',
          boxShadow: showChatPanel ? '-8px 0 32px rgba(0,0,0,0.35)' : 'none',
          borderLeft: '1px solid var(--border)',
        }}>
          <StaffChatPanel onClose={() => setShowChatPanel(false)} />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
