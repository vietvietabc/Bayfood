import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import CartPage from './pages/CartPage';
import ReservationPage from './pages/ReservationPage';
import CustomerDashboardPage from './pages/CustomerDashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
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

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="app app-shell">
            <Navbar />
            <main>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/menu" element={<MenuPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/reservation" element={<ReservationPage />} />
                <Route path="/account" element={<CustomerDashboardPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                {/* Admin Routes - Chỉ dành cho Quản lý */}
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
            {/* Footer có thể thêm sau */}
            <footer style={{ borderTop: '1px solid var(--border)', padding: '2rem 0', marginTop: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div className="container">
                <p>&copy; 2026 BayFood Restaurant. All rights reserved.</p>
              </div>
            </footer>
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
