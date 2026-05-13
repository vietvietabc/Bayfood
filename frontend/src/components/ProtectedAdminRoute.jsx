import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Bảo vệ các Route dành riêng cho Admin.
 * Kiểm tra 2 điều kiện:
 * 1. Người dùng đã đăng nhập chưa? Nếu chưa → chuyển về /login
 * 2. Người dùng có vai trò "Quản lý" không? Nếu không → chuyển về / (trang chủ)
 */
const ProtectedAdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const roleName = (user?.tenVaiTro || '').trim().toLowerCase();
  const isAdmin = user?.id_vaiTro === 2 || roleName === 'quản lý' || roleName === 'quan ly';

  // Đang load thông tin user thì chưa làm gì
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: '1.2rem', color: 'var(--text-muted)' }}>
        Đang kiểm tra quyền...
      </div>
    );
  }

  // Chưa đăng nhập → về trang đăng nhập
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Đã đăng nhập nhưng không phải Admin → về trang chủ
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Đủ điều kiện → hiển thị trang Admin
  return children;
};

export default ProtectedAdminRoute;
