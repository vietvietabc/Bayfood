import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2, ArrowRight, ShoppingCart } from 'lucide-react';
import axios from 'axios';
import { useCart } from '../context/CartContext';

const CartPage = () => {
    const navigate = useNavigate();
    const { cart, updateQuantity, removeFromCart, cartTotal, clearCart, selectedTableId } = useCart();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCheckout = async () => {
        if (cart.length === 0 || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const orderData = {
                id_ban: selectedTableId || undefined,
                chi_tiet: cart.map((item) => ({
                    id_monAn: item.id_monAn,
                    soLuong: item.quantity,
                    giaTaiThoiDiemBan: item.giaTien,
                })),
            };

            await axios.post('http://localhost:8000/api/donhang', orderData);
            clearCart();
            alert('Đặt món thành công! Đơn hàng của bạn đang được xử lý.');
            navigate('/menu');
        } catch (error) {
            console.error('Error placing order:', error);
            alert(error.response?.data?.detail || 'Đã xảy ra lỗi khi đặt món.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Giỏ Hàng</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Kiểm tra món ăn, chỉnh số lượng và tiến hành đặt món.</p>
                </div>
                <Link to="/menu" className="btn btn-outline" style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                    <ShoppingBag size={18} /> Tiếp tục chọn món
                </Link>
            </div>

            {cart.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <ShoppingCart size={56} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.6 }} />
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Giỏ hàng đang trống</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                        Thêm món từ thực đơn để tạo đơn hàng mới.
                    </p>
                    <Link to="/menu" className="btn btn-primary" style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                        Xem thực đơn <ArrowRight size={18} />
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-8" style={{ alignItems: 'start' }}>
                    <div className="card" style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Món đã chọn</h2>
                        </div>

                        <div style={{ padding: '1rem' }}>
                            {cart.map((item) => (
                                <div
                                    key={item.id_monAn}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '88px 1fr auto',
                                        gap: '1rem',
                                        padding: '1rem',
                                        borderRadius: '0.75rem',
                                        background: 'var(--surface-light)',
                                        marginBottom: '0.75rem',
                                        alignItems: 'center',
                                    }}
                                >
                                    <img
                                        src={item.hinhAnh || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'}
                                        alt={item.tenMon}
                                        style={{ width: '88px', height: '88px', objectFit: 'cover', borderRadius: '0.75rem' }}
                                    />

                                    <div>
                                        <h3 style={{ marginBottom: '0.35rem', fontSize: '1.05rem' }}>{item.tenMon}</h3>
                                        <p style={{ color: 'var(--primary)', fontWeight: 'bold', marginBottom: '0.75rem' }}>
                                            {Number(item.giaTien).toLocaleString('vi-VN')} đ
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <button className="btn btn-outline" style={{ padding: '0.35rem' }} onClick={() => updateQuantity(item.id_monAn, -1)}>
                                                <Minus size={16} />
                                            </button>
                                            <span style={{ minWidth: '28px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</span>
                                            <button className="btn btn-outline" style={{ padding: '0.35rem' }} onClick={() => updateQuantity(item.id_monAn, 1)}>
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        className="btn"
                                        style={{ padding: '0.5rem', background: 'transparent', color: 'var(--danger)' }}
                                        onClick={() => removeFromCart(item.id_monAn)}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card" style={{ padding: '1.5rem', position: 'sticky', top: '1.5rem' }}>
                        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Tóm tắt đơn hàng</h2>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
                            <span>Số lượng món</span>
                            <strong style={{ color: 'var(--text-main)' }}>{cart.reduce((count, item) => count + item.quantity, 0)}</strong>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
                            <span>Tạm tính</span>
                            <strong style={{ color: 'var(--text-main)' }}>{cartTotal.toLocaleString('vi-VN')} đ</strong>
                        </div>

                        <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(249, 115, 22, 0.08)', marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
                            {selectedTableId ? `Đơn này sẽ được gắn vào bàn #${selectedTableId}.` : 'Đặt món sẽ tạo đơn ngay và chuyển sang trang thực đơn sau khi hoàn tất.'}
                        </div>

                        <button
                            className="btn btn-primary w-full"
                            style={{ padding: '1rem', fontSize: '1.05rem', display: 'inline-flex', justifyContent: 'center', gap: '0.5rem' }}
                            onClick={handleCheckout}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Đang xử lý...' : 'Xác nhận đặt món'}
                        </button>

                        <button
                            className="btn btn-outline w-full mt-4"
                            style={{ padding: '1rem', fontSize: '1rem' }}
                            onClick={() => clearCart()}
                            disabled={isSubmitting}
                        >
                            Xóa toàn bộ giỏ hàng
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CartPage;