import React from 'react';
import { X, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axiosSetup';

const CartDrawer = () => {
  const { isDrawerOpen, toggleDrawer, cart, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      const orderData = {
        chi_tiet: cart.map(item => ({
          id_monAn: item.id_monAn,
          soLuong: item.quantity,
          giaTaiThoiDiemBan: item.giaTien
        }))
      };

      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');
      await axios.post(`${apiUrl}/api/donhang`, orderData);
      alert('Đặt món thành công! Đơn hàng của bạn đang được xử lý.');
      clearCart();
      toggleDrawer();
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Đã xảy ra lỗi khi đặt món.');
    }
  };

  return (
    <>
      <div
        className={`drawer-overlay ${isDrawerOpen ? 'open' : ''}`}
        onClick={toggleDrawer}
      ></div>

      <div className={`drawer ${isDrawerOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h2 style={{ fontSize: '1.25rem' }}>Giỏ Hàng Của Bạn</h2>
          <button onClick={toggleDrawer} className="btn" style={{ padding: '0.5rem', background: 'transparent', color: 'var(--text-main)' }}>
            <X size={24} />
          </button>
        </div>

        <div className="drawer-content">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
              <ShoppingCart size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p>Giỏ hàng đang trống</p>
              <button
                className="btn btn-outline mt-4"
                onClick={() => {
                  toggleDrawer();
                  navigate('/menu');
                }}
              >
                Khám phá thực đơn
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {cart.map(item => (
                <div key={item.id_monAn} className="flex gap-4 items-center" style={{ padding: '1rem', background: 'var(--surface-light)', borderRadius: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ marginBottom: '0.25rem' }}>{item.tenMon}</h4>
                    <p style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                      {Number(item.giaTien).toLocaleString('vi-VN')} đ
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="btn btn-outline" style={{ padding: '0.25rem' }} onClick={() => updateQuantity(item.id_monAn, -1)}>
                      <Minus size={16} />
                    </button>
                    <span style={{ width: '20px', textAlign: 'center' }}>{item.quantity}</span>
                    <button className="btn btn-outline" style={{ padding: '0.25rem' }} onClick={() => updateQuantity(item.id_monAn, 1)}>
                      <Plus size={16} />
                    </button>
                  </div>

                  <button className="btn" style={{ padding: '0.5rem', color: 'var(--danger)', background: 'transparent' }} onClick={() => removeFromCart(item.id_monAn)}>
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="drawer-footer">
            <div className="flex justify-between items-center mb-4">
              <span style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>Tổng cộng:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                {cartTotal.toLocaleString('vi-VN')} đ
              </span>
            </div>
            <button className="btn btn-primary w-full py-8" style={{ fontSize: '1.125rem' }} onClick={handleCheckout}>
              Tiến Hành Đặt Món
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
