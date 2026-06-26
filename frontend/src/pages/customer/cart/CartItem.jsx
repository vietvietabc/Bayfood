import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';

const CartItem = ({ item, updateQuantity, removeFromCart }) => {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr auto', gap: '1rem', padding: '1rem', borderRadius: '0.75rem', background: 'var(--surface-light)', marginBottom: '0.75rem', alignItems: 'center' }}>
            <img src={item.hinhAnh || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'} alt={item.tenMon} style={{ width: '88px', height: '88px', objectFit: 'cover', borderRadius: '0.75rem' }} />
            <div>
                <h3 style={{ marginBottom: '0.35rem', fontSize: '1.05rem' }}>{item.tenMon}</h3>
                <p style={{ color: 'var(--primary)', fontWeight: 'bold', marginBottom: '0.75rem' }}>{Number(item.giaTien).toLocaleString('vi-VN')} đ</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button className="btn btn-outline" style={{ padding: '0.35rem' }} onClick={() => updateQuantity(item.id_monAn, -1)} aria-label={`Giảm số lượng ${item.tenMon}`}><Minus size={16} /></button>
                    <span style={{ minWidth: '28px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</span>
                    <button className="btn btn-outline" style={{ padding: '0.35rem' }} onClick={() => updateQuantity(item.id_monAn, 1)} aria-label={`Tăng số lượng ${item.tenMon}`}><Plus size={16} /></button>
                </div>
            </div>
            <button className="btn" style={{ padding: '0.5rem', background: 'transparent', color: 'var(--danger)' }} onClick={() => removeFromCart(item.id_monAn)} aria-label={`Xóa ${item.tenMon} khỏi giỏ hàng`}><Trash2 size={18} /></button>
        </div>
    );
};

export default CartItem;
