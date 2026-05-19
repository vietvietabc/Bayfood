import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import KitchenNavbar from './components/KitchenNavbar';
import WaiterNavbar from './components/WaiterNavbar';
import WaiterPage from './pages/waiter/WaiterPage';
import HomePage from './pages/customer/HomePage';
import MenuPage from './pages/customer/MenuPage';
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
import AdminWorkingHours from './pages/admin/AdminWorkingHours';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
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
            <Route path="working-hours" element={<AdminWorkingHours />} />
          </Route>
        </Routes>
      </main>

      {/* Footer chỉ hiện ở trang customer */}
      {!isKitchen && !isAdmin && !isWaiter && (
        <footer style={{ borderTop: '1px solid var(--border)', padding: '2rem 0', marginTop: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="container">
            <p>&copy; 2026 BayFood Restaurant. All rights reserved.</p>
          </div>
        </footer>
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <AppLayout />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
