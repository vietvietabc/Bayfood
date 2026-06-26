import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import KitchenNavbar from './components/KitchenNavbar';
import WaiterNavbar from './components/WaiterNavbar';
import WaiterPage from './pages/waiter/WaiterPage';
import HomePage from './pages/customer/HomePage';
import MenuPage from './pages/customer/MenuPage';
import FoodDetailPage from './pages/customer/FoodDetailPage';
import CartPage from './pages/customer/CartPage';
import ReservationPage from './pages/customer/ReservationPage';
import CustomerDashboardPage from './pages/customer/CustomerDashboard';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import KitchenPage from './pages/kitchen/KitchenPage';
import VNPayReturn from './pages/payment/VNPayReturn';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminReservations from './pages/admin/AdminReservations';
import AdminMenu from './pages/admin/AdminMenu';
import AdminOrders from './pages/admin/AdminOrders';
import AdminUsers from './pages/admin/AdminUsers';
import AdminCategories from './pages/admin/AdminCategories';
import AdminTables from './pages/admin/AdminTables';
import AdminReviews from './pages/admin/AdminReviews';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ChatWidget from './components/Chatbot/ChatWidget';
import LiveChatWidget from './components/LiveChatWidget';
import './index.css';

// Layout wrapper chọn navbar theo route
const AppLayout = () => {
  const location = useLocation();
  const isKitchen = location.pathname.startsWith('/kitchen');
  const isAdmin = location.pathname.startsWith('/admin');
  const isWaiter = location.pathname.startsWith('/waiter');

  return (
    <div className="app app-shell">
      {/* Navbar theo từng khu vực */}
      {isKitchen && <KitchenNavbar />}
      {isWaiter && <WaiterNavbar />}
      {!isKitchen && !isAdmin && !isWaiter && <Navbar />}

      <main>
        <Routes>
          {/* Customer / Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/menu/:id" element={<FoodDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/reservation" element={<ReservationPage />} />
          <Route path="/account" element={<CustomerDashboardPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/payment/vnpay-return" element={<VNPayReturn />} />

          {/* Kitchen route */}
          <Route path="/kitchen" element={<KitchenPage />} />

          {/* Waiter route */}
          <Route path="/waiter" element={<WaiterPage />} />

          {/* Admin Routes - dùng AdminLayout riêng */}
          <Route path="/admin" element={
            <ProtectedAdminRoute>
              <AdminLayout />
            </ProtectedAdminRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="tables" element={<AdminTables />} />
            <Route path="reservations" element={<AdminReservations />} />
            <Route path="menu" element={<AdminMenu />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="reviews" element={<AdminReviews />} />
          </Route>
        </Routes>
      </main>

      {/* Footer & Chat Widgets chỉ hiện ở trang customer */}
      {!isKitchen && !isAdmin && !isWaiter && (
        <>
          <footer style={{ borderTop: '1px solid var(--border)', padding: '2rem 0', marginTop: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="container">
              <p>&copy; 2026 BayFood Restaurant. All rights reserved.</p>
            </div>
          </footer>
          <ChatWidget />
          <LiveChatWidget />
        </>
      )}
    </div>
  );
};

function App() {
  const [alertState, setAlertState] = React.useState({ show: false, message: '', type: 'info' });

  React.useEffect(() => {
    const handleNativeAlert = (message) => {
      let type = 'info';
      const msgStr = String(message || '');
      const lower = msgStr.toLowerCase();

      if (lower.includes('thành công') || lower.includes('cảm ơn') || lower.includes('xác nhận') || lower.includes('hoàn tất')) {
        type = 'success';
      } else if (
        lower.includes('lỗi') ||
        lower.includes('không thể') ||
        lower.includes('thất bại') ||
        lower.includes('chưa') ||
        lower.includes('vui lòng') ||
        lower.includes('yêu cầu') ||
        lower.includes('chỉ định') ||
        lower.includes('cảnh báo') ||
        lower.includes('không tìm thấy') ||
        lower.includes('cho phép')
      ) {
        type = 'warning';
      }

      setAlertState({
        show: true,
        message: msgStr,
        type: type
      });
    };

    window.alert = handleNativeAlert;
  }, []);

  return (
    <ThemeProvider>
    <AuthProvider>
      <CartProvider>
        <Router>
          <AppLayout />
        </Router>

        {/* Global Beautiful Custom Alert Modal */}
        {alertState.show && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'var(--overlay-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 999999, padding: '1rem',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div className="card" style={{
              maxWidth: '420px', width: '100%',
              padding: '2rem',
              border: '1px solid var(--alert-border)',
              background: 'var(--alert-bg)',
              boxShadow: 'var(--alert-shadow)',
              borderRadius: '1rem',
              textAlign: 'center',
              transform: 'scale(1)',
              animation: 'scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
              <div style={{
                width: '56px', height: '56px',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.25rem auto',
                background: alertState.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : alertState.type === 'warning' ? 'rgba(249, 115, 22, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                color: alertState.type === 'success' ? '#10b981' : alertState.type === 'warning' ? '#fb923c' : '#3b82f6',
                border: `1px solid ${alertState.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : alertState.type === 'warning' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`
              }}>
                {alertState.type === 'success' ? (
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : alertState.type === 'warning' ? (
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                ) : (
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.084 1.085l-.041.02H11.25zm0 5.25h.008v.008H11.25V16.5zm-9-4.5a9 9 0 1118 0 9 9 0 01-18 0z" />
                  </svg>
                )}
              </div>

              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: 'var(--alert-title-color)',
                marginBottom: '0.75rem'
              }}>
                {alertState.type === 'success' ? 'Thành công' : alertState.type === 'warning' ? 'Cảnh báo' : 'Thông báo'}
              </h3>

              <p style={{
                color: 'var(--alert-text-color)',
                fontSize: '0.925rem',
                lineHeight: '1.5',
                marginBottom: '1.75rem',
                whiteSpace: 'pre-line'
              }}>
                {alertState.message}
              </p>

              <button
                onClick={() => {
                  setAlertState({ show: false, message: '', type: 'info' });
                }}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  letterSpacing: '0.025em',
                  background: alertState.type === 'success' ? '#10b981' : alertState.type === 'warning' ? '#fb923c' : '#3b82f6',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Đồng ý
              </button>
            </div>
          </div>
        )}
        
      </CartProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
