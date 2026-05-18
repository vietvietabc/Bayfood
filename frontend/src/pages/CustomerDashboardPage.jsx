import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CalendarDays, ClipboardList, Clock3, LogIn, MapPin, UtensilsCrossed, UserCircle2, MapPinned, Bell, CheckCheck, Eye, X, Star, ChefHat, User, Edit3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const formatDateTime = (value) => {
    if (!value) {
        return 'Chưa cập nhật';
    }

    return new Date(value).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const currencyFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const formatCurrency = (amount) => currencyFormatter.format(amount || 0);

const getMonStatusColor = (status) => {
    switch (status) {
        case 'Chờ chế biến': return '#eab308';
        case 'Đang chế biến': return '#3b82f6';
        case 'Hoàn thành': return '#10b981';
        default: return 'var(--text-muted)';
    }
};

const getStatusStyle = (status) => {
    const mapping = {
        'Chờ xác nhận': { bg: 'rgba(234, 179, 8, 0.12)', color: '#ca8a04' },
        'Đã đặt': { bg: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' },
        'Đã xác nhận': { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669' },
        'Đã checkin': { bg: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed' },
        'Hoàn thành': { bg: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' },
        'Đã hủy': { bg: 'rgba(239, 68, 68, 0.12)', color: '#dc2626' },
        'Vắng mặt': { bg: 'rgba(239, 68, 68, 0.18)', color: '#dc2626' },
        'Chờ khách đến': { bg: 'rgba(249, 115, 22, 0.12)', color: '#ea580c' },
        'Đang chờ món': { bg: 'rgba(234, 179, 8, 0.12)', color: '#ca8a04' },
        'Đang chế biến': { bg: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' },
        'Đã phục vụ': { bg: 'rgba(168, 85, 247, 0.12)', color: '#7c3aed' },
        'Đã thanh toán': { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669' },
    };

    return mapping[status] || { bg: 'var(--surface-light)', color: 'var(--text-muted)' };
};

const CustomerDashboardPage = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { setCartFromOrder } = useCart();
    const [data, setData] = useState({ reservations: [], orders: [] });
    const { reservations, orders } = data;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [checkinLoadingId, setCheckinLoadingId] = useState(null);
    const [actionMessage, setActionMessage] = useState('');
    const [checkinToast, setCheckinToast] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderDetailLoading, setOrderDetailLoading] = useState(false);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [showReservationModal, setShowReservationModal] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewForm, setReviewForm] = useState({ id_donHang: null, soSao: 5, noiDung: '' });
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    // QR Payment states
    const [qrModal, setQrModal] = useState(null);
    const [copiedField, setCopiedField] = useState(null);

    const handleCopyText = (text, fieldName) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    useEffect(() => {
        if (!checkinToast) {
            return undefined;
        }

        const timerId = window.setTimeout(() => {
            setCheckinToast('');
        }, 3500);

        return () => window.clearTimeout(timerId);
    }, [checkinToast]);

    const fetchCustomerData = async (isSilent = false) => {
        if (!user) {
            setLoading(false);
            return;
        }

        if (!isSilent) setLoading(true);
        setError('');

        try {
            const [reservationRes, orderRes, reviewRes] = await Promise.all([
                axios.get(`${BASE_URL}/api/datban/me`),
                axios.get(`${BASE_URL}/api/donhang/me`),
                axios.get(`${BASE_URL}/api/danhgia/me`),
            ]);

            setData({
                reservations: reservationRes.data || [],
                orders: orderRes.data || []
            });
            setReviews(reviewRes.data || []);
        } catch (fetchError) {
            console.error('Failed to load customer dashboard', fetchError);
            if (!isSilent) setError('Không thể tải dữ liệu khách hàng. Vui lòng thử lại sau.');
        } finally {
            if (!isSilent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomerData(false);
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const interval = setInterval(() => {
            fetchCustomerData(true);
        }, 10000);
        return () => clearInterval(interval);
    }, [user]);

    if (authLoading || (loading && user)) {
        return (
            <div className="container py-16">
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <div style={{ width: '42px', height: '42px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }}></div>
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Đang tải khu vực khách hàng...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="container py-16">
                <div className="card" style={{ padding: '3rem', textAlign: 'center', maxWidth: '720px', margin: '0 auto' }}>
                    <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)', marginBottom: '1rem' }}>
                        <UserCircle2 size={32} />
                    </div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>Khu vực khách hàng</h1>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                        Đăng nhập để xem đơn hàng, đặt bàn và thông tin tài khoản của bạn.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <LogIn size={18} /> Đăng nhập
                        </Link>
                        <Link to="/register" className="btn btn-outline">Đăng ký tài khoản</Link>
                        <Link to="/menu" className="btn btn-outline">Xem thực đơn</Link>
                    </div>
                </div>
            </div>
        );
    }

    const activeReservations = reservations.filter((item) => ['Chờ xác nhận', 'Đã đặt'].includes(item.trangThai)).length;
    const activeOrders = orders.filter((item) => item.tinhTrang !== 'Đã thanh toán').length;

    const handleCheckin = async (reservationId) => {
        setCheckinLoadingId(reservationId);
        setActionMessage('');

        const reservation = reservations.find((item) => item.id_datBan === reservationId);
        const reservationTime = reservation?.thoiGianDen ? new Date(reservation.thoiGianDen) : null;
        const checkinOpenTime = reservationTime ? new Date(reservationTime.getTime() - 15 * 60 * 1000) : null;

        if (checkinOpenTime && Date.now() < checkinOpenTime.getTime()) {
            setCheckinToast('Nhà hàng chỉ nhận check-in trong vòng 15 phút trước giờ đặt bàn.');
            setCheckinLoadingId(null);
            return;
        }

        try {
            await axios.post(`${BASE_URL}/api/datban/${reservationId}/checkin`);
            setActionMessage('Check-in thành công. Admin đã nhận thông báo bàn của bạn đã tới nơi.');
            setData(current => ({
                ...current,
                reservations: current.reservations.map((reservation) => (
                    reservation.id_datBan === reservationId
                        ? { ...reservation, trangThai: 'Đã checkin', thoiGianDenThucTe: new Date().toISOString() }
                        : reservation
                ))
            }));
        } catch (checkinError) {
            console.error('Failed to check in', checkinError);
            setActionMessage(checkinError.response?.data?.detail || 'Không thể check-in lúc này.');
        } finally {
            setCheckinLoadingId(null);
        }
    };

    const handleMarkNotificationRead = async (notificationId) => {
        try {
            await axios.put(`${BASE_URL}/api/thongbao/${notificationId}/read`);
        } catch (notificationError) {
            console.error('Failed to mark notification as read', notificationError);
        }
    };

    const handleVNPayPayment = async (paymentType, targetId, amount) => {
        try {
            const res = await axios.post(`${BASE_URL}/api/payment/create-vnpay-url`, {
                payment_type: paymentType,
                target_id: targetId,
                amount: amount,
            });
            window.location.href = res.data.paymentUrl;
        } catch (err) {
            alert(err.response?.data?.detail || 'Không thể khởi tạo thanh toán. Vui lòng thử lại.');
        }
    };

    const handleViewOrder = async (orderId) => {
        setOrderDetailLoading(true);
        setShowOrderModal(true);
        try {
            const response = await axios.get(`${BASE_URL}/api/donhang/me/${orderId}`);
            setSelectedOrder(response.data);
        } catch (error) {
            console.error('Lỗi tải chi tiết đơn hàng', error);
            alert('Không thể tải chi tiết đơn hàng.');
            setShowOrderModal(false);
        } finally {
            setOrderDetailLoading(false);
        }
    };

    const handleCloseOrderModal = () => {
        setShowOrderModal(false);
        setSelectedOrder(null);
    };

    const handleEditOrder = (order) => {
        const cartItems = order.chi_tiet.map(ct => ({
            id_monAn: ct.id_monAn,
            tenMon: ct.tenMon,
            hinhAnh: ct.hinhAnhMon,
            giaTien: ct.giaTaiThoiDiemBan,
            quantity: ct.soLuong
        }));
        setCartFromOrder(cartItems, order.id_donHang, order.thoiGianDen);
        navigate('/cart');
    };

    const handleCheckinOrder = async (orderId) => {
        setCheckinLoadingId(orderId);
        setActionMessage('');

        const order = orders.find((item) => item.id_donHang === orderId);
        const orderTime = order?.thoiGianDen ? new Date(order.thoiGianDen) : null;
        const checkinOpenTime = orderTime ? new Date(orderTime.getTime() - 15 * 60 * 1000) : null;

        if (checkinOpenTime && Date.now() < checkinOpenTime.getTime()) {
            setCheckinToast('Chỉ nhận báo tới trong vòng 15 phút trước thời gian đã hẹn.');
            setCheckinLoadingId(null);
            return;
        }

        try {
            await axios.put(`${BASE_URL}/api/donhang/me/${orderId}/checkin`);

            const orderRes = await axios.get(`${BASE_URL}/api/donhang/me`);
            setData(current => ({ ...current, orders: orderRes.data }));

            setCheckinToast('Đã báo tới thành công!');
            setActionMessage('Bếp đã nhận được thông báo và bắt đầu chuẩn bị món cho bạn!');
        } catch (error) {
            console.error('Lỗi khi báo đã tới:', error);
            alert(error.response?.data?.detail || 'Không thể báo đã tới.');
        } finally {
            setCheckinLoadingId(null);
        }
    };

    const handleSubmittingReview = async (e) => {
        e.preventDefault();
        setIsSubmittingReview(true);
        try {
            const res = await axios.post(`${BASE_URL}/api/danhgia/`, {
                id_donHang: reviewForm.id_donHang,
                soSao: reviewForm.soSao,
                noiDung: reviewForm.noiDung
            });
            setReviews(current => [res.data, ...current]);
            setShowReviewModal(false);
            alert('Cảm ơn bạn đã gửi đánh giá và đóng góp ý kiến!');
        } catch (err) {
            console.error('Lỗi khi gửi đánh giá:', err);
            alert(err.response?.data?.detail || 'Không thể gửi đánh giá lúc này.');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleCreatePaymentUrl = async (paymentType, targetId, amount) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `http://localhost:8000/api/payment/create-mock-vnpay-url`,
                {
                    payment_type: paymentType,
                    target_id: targetId,
                    amount: parseFloat(amount)
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            if (response.data && response.data.paymentUrl) {
                window.location.href = response.data.paymentUrl;
            }
        } catch (error) {
            console.error('Lỗi khi tạo link thanh toán:', error);
            alert(error.response?.data?.detail || 'Không thể tạo link thanh toán lúc này.');
        }
    };

    const handleViewReservation = (reservation) => {
        setSelectedReservation(reservation);
        setShowReservationModal(true);
    };

    const handleCloseReservationModal = () => {
        setShowReservationModal(false);
        setSelectedReservation(null);
    };

    return (
        <div className="container py-8">
            {checkinToast && (
                <div
                    style={{
                        position: 'fixed',
                        right: '1.25rem',
                        bottom: '1.25rem',
                        zIndex: 120,
                        maxWidth: '360px',
                        padding: '0.95rem 1rem',
                        borderRadius: '0.9rem',
                        background: 'rgba(249, 115, 22, 0.96)',
                        color: 'white',
                        boxShadow: '0 18px 45px rgba(0, 0, 0, 0.22)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        fontWeight: 'bold',
                    }}
                >
                    {checkinToast}
                </div>
            )}

            {error && (
                <div style={{ padding: '1rem', marginBottom: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--danger)', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger)' }}>
                    {error}
                </div>
            )}

            {actionMessage && (
                <div style={{ padding: '1rem', marginBottom: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--primary)', background: 'rgba(249, 115, 22, 0.08)', color: 'var(--text)' }}>
                    {actionMessage}
                </div>
            )}

            <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.12), rgba(255, 247, 237, 0.8))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '999px', background: 'rgba(255,255,255,0.7)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                            <UserCircle2 size={16} /> Khu vực khách hàng
                        </div>
                        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Xin chào, {user.hoTen}</h1>
                        <p style={{ color: 'var(--text-muted)', maxWidth: '720px' }}>
                            Đây là nơi bạn xem nhanh các đặt bàn, đơn món và trạng thái xử lý hiện tại.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <Link to="/menu" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <UtensilsCrossed size={18} /> Đặt món
                        </Link>
                        <Link to="/reservation" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CalendarDays size={18} /> Đặt bàn
                        </Link>
                    </div>
                </div>
            </div>

            {/* <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Bell size={20} color="var(--primary)" />
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Thông báo của bạn</h2>
                            <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Admin xác nhận hoặc cập nhật bàn sẽ hiện ở đây.</p>
                        </div>
                    </div>
                    <span style={{ padding: '0.3rem 0.7rem', borderRadius: '999px', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.875rem' }}>
                        {unreadCount} chưa đọc
                    </span>
                </div>

                {notifications.length === 0 ? (
                    <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'var(--surface-light)', color: 'var(--text-muted)' }}>
                        Chưa có thông báo nào.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '260px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                        {notifications.slice(0, 5).map((notification) => (
                            <div
                                key={notification.id_thongBao}
                                style={{
                                    padding: '1rem',
                                    borderRadius: '0.75rem',
                                    border: notification.daDoc ? '1px solid var(--border)' : '1px solid rgba(249, 115, 22, 0.35)',
                                    background: notification.daDoc ? 'var(--surface-light)' : 'rgba(249, 115, 22, 0.08)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{notification.tieuDe}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>{notification.noiDung}</div>
                                    </div>
                                    {!notification.daDoc && (
                                        <button
                                            type="button"
                                            onClick={() => handleMarkNotificationRead(notification.id_thongBao)}
                                            className="btn btn-outline"
                                            style={{ padding: '0.45rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                                        >
                                            <CheckCheck size={16} /> Đã đọc
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div> */}

            <div className="grid grid-cols-3 gap-6" style={{ marginBottom: '1.5rem' }}>
                <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>
                        <ClipboardList size={22} />
                        <strong>Đơn món</strong>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{orders.length}</div>
                    <div style={{ color: 'var(--text-muted)' }}>{activeOrders} đơn đang xử lý</div>
                </div>

                <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: '#2563eb' }}>
                        <MapPin size={22} />
                        <strong>Đặt bàn</strong>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{reservations.length}</div>
                    <div style={{ color: 'var(--text-muted)' }}>{activeReservations} đặt bàn đang chờ hoặc đã xác nhận</div>
                </div>

                <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: '#059669' }}>
                        <Clock3 size={22} />
                        <strong>Tài khoản</strong>
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{user.tenVaiTro || 'Khách hàng'}</div>
                    <div style={{ color: 'var(--text-muted)' }}>{user.soDienThoai || 'Chưa cập nhật số điện thoại'}</div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6" style={{ alignItems: 'start' }}>
                <section className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Lịch sử đặt bàn</h2>
                            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                Tất cả các lượt đặt bàn của bạn được sắp theo thời gian mới nhất.
                            </p>
                        </div>
                        <Link to="/reservation" style={{ color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'none' }}>Đặt thêm</Link>
                    </div>

                    {reservations.length === 0 ? (
                        <div style={{ padding: '1.25rem', borderRadius: '0.75rem', background: 'var(--surface-light)', color: 'var(--text-muted)' }}>
                            Bạn chưa có lịch sử đặt bàn nào.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '520px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                            {reservations.map((reservation) => {
                                const statusStyle = getStatusStyle(reservation.trangThai);

                                return (
                                    <div key={reservation.id_datBan} style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--surface-light)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                            <strong>#{reservation.id_datBan} - Bàn {reservation.id_ban || 'Chưa chọn'}</strong>
                                            <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', background: statusStyle.bg, color: statusStyle.color, fontSize: '0.875rem' }}>
                                                {reservation.trangThai}
                                            </span>
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', display: 'grid', gap: '0.25rem' }}>
                                            <span>Thời gian: {formatDateTime(reservation.thoiGianDen)}</span>
                                            <span>Đến thực tế: {formatDateTime(reservation.thoiGianDenThucTe)}</span>
                                            <span>Số người: {reservation.soNguoi}</span>
                                            {reservation.ghiChu ? <span>Ghi chú: {reservation.ghiChu}</span> : null}
                                            {/* Tiền cọc */}
                                            {reservation.tienCoc > 0 && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                                                    Tiền cọc:
                                                    <strong style={{ color: reservation.trangThaiCoc === 'Mất cọc' ? '#dc2626' : reservation.trangThaiCoc === 'Đã cọc' ? '#059669' : '#ca8a04' }}>
                                                        {Number(reservation.tienCoc).toLocaleString('vi-VN')} ₫
                                                    </strong>
                                                    <span style={{
                                                        padding: '0.1rem 0.45rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '700',
                                                        background: reservation.trangThaiCoc === 'Mất cọc' ? 'rgba(239,68,68,0.12)' : reservation.trangThaiCoc === 'Đã cọc' ? 'rgba(16,185,129,0.12)' : 'rgba(234,179,8,0.12)',
                                                        color: reservation.trangThaiCoc === 'Mất cọc' ? '#dc2626' : reservation.trangThaiCoc === 'Đã cọc' ? '#059669' : '#ca8a04'
                                                    }}>
                                                        {reservation.trangThaiCoc}
                                                    </span>
                                                </span>
                                            )}
                                            {/* Lý do vắng mặt */}
                                            {reservation.lyDoHuy && (
                                                <span style={{ color: '#dc2626', fontSize: '0.875rem', fontStyle: 'italic' }}>Lý do: {reservation.lyDoHuy}</span>
                                            )}
                                            {orders.some(o => o.id_datBan === reservation.id_datBan) && (
                                                <span style={{ color: '#2563eb', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                                                    Đã đặt món đi kèm
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ marginTop: '0.9rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                            {reservation.tienCoc > 0 && reservation.trangThaiCoc !== 'Đã cọc' && reservation.trangThaiCoc !== 'Mất cọc' && reservation.trangThai !== 'Đã hủy' && reservation.trangThai !== 'Vắng mặt' && (
                                                <>
                                                    <button
                                                        onClick={() => handleVNPayPayment('datban', reservation.id_datBan, reservation.tienCoc)}
                                                        style={{
                                                            padding: '0.5rem 1rem',
                                                            fontSize: '0.875rem',
                                                            background: 'linear-gradient(135deg, #0066cc, #004fa3)',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: '0.5rem',
                                                            fontWeight: 'bold',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.4rem',
                                                            boxShadow: '0 2px 8px rgba(0,102,204,0.3)',
                                                        }}
                                                    >
                                                        Thanh toán cọc VNPay ({Number(reservation.tienCoc).toLocaleString('vi-VN')} ₫)
                                                    </button>
                                                    <button
                                                        onClick={() => setQrModal({
                                                            amount: reservation.tienCoc,
                                                            addInfo: `DAT BAN DB${reservation.id_datBan}`,
                                                            label: `Thanh toán cọc đặt bàn #${reservation.id_datBan}`
                                                        })}
                                                        style={{
                                                            padding: '0.5rem 1rem',
                                                            fontSize: '0.875rem',
                                                            background: 'linear-gradient(135deg, #10b981, #059669)',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: '0.5rem',
                                                            fontWeight: 'bold',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.4rem',
                                                            boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
                                                        }}
                                                    >
                                                        Quét mã VietQR ({Number(reservation.tienCoc).toLocaleString('vi-VN')} ₫)
                                                    </button>
                                                </>
                                            )}

                                            <button className="btn btn-outline" onClick={() => handleViewReservation(reservation)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Eye size={16} /> Xem chi tiết
                                            </button>

                                            {reservation.trangThai === 'Đã xác nhận' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCheckin(reservation.id_datBan)}
                                                    disabled={checkinLoadingId === reservation.id_datBan}
                                                    className="btn btn-primary"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem' }}
                                                >
                                                    <MapPinned size={16} />
                                                    {checkinLoadingId === reservation.id_datBan ? 'Đang check-in...' : 'Tôi đã tới bàn'}
                                                </button>
                                            )}
                                        </div>

                                        {reservation.trangThai === 'Chờ xác nhận' && (
                                            <div style={{ marginTop: '0.9rem', padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(234, 179, 8, 0.08)', color: '#ca8a04', fontSize: '0.875rem', fontWeight: 'bold' }}>
                                                Bàn đang chờ admin xác nhận, chưa thể check-in.
                                            </div>
                                        )}

                                        {reservation.trangThai === 'Đã đặt' && (
                                            <div style={{ marginTop: '0.9rem', padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(59, 130, 246, 0.08)', color: '#2563eb', fontSize: '0.875rem', fontWeight: 'bold' }}>
                                                Bàn đã được đặt, chờ admin xác nhận trước khi check-in.
                                            </div>
                                        )}

                                        {reservation.trangThai === 'Đã checkin' && (
                                            <div style={{ marginTop: '0.9rem', padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(124, 58, 237, 0.08)', color: '#7c3aed', fontSize: '0.875rem', fontWeight: 'bold' }}>
                                                Đã check-in, admin đã được thông báo.
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Lịch sử đặt món</h2>
                            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                Xem lại tất cả đơn món bạn đã tạo và trạng thái xử lý hiện tại.
                            </p>
                        </div>
                        <Link to="/cart" style={{ color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'none' }}>Xem giỏ hàng</Link>
                    </div>

                    {orders.length === 0 ? (
                        <div style={{ padding: '1.25rem', borderRadius: '0.75rem', background: 'var(--surface-light)', color: 'var(--text-muted)' }}>
                            Bạn chưa có lịch sử đặt món nào.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '520px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                            {orders.map((order) => {
                                const statusStyle = getStatusStyle(order.tinhTrang);

                                return (
                                    <div key={order.id_donHang} style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--surface-light)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                            <strong>#{order.id_donHang}</strong>
                                            <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', background: statusStyle.bg, color: statusStyle.color, fontSize: '0.875rem' }}>
                                                {order.tinhTrang}
                                            </span>
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', display: 'grid', gap: '0.25rem' }}>
                                            <span>Thời gian tạo: {formatDateTime(order.thoiGianTao)}</span>
                                            <span>Bàn: {order.id_ban || 'Chưa gán bàn'}</span>
                                            {order.thoiGianDen && (
                                                <span>Thời gian tới: {formatDateTime(order.thoiGianDen)}</span>
                                            )}
                                            {order.id_datBan && (
                                                <span style={{ color: '#10b981', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                                                    Đã đặt kèm bàn #{order.id_datBan}
                                                </span>
                                            )}
                                            {/* Hiển thị tiền cọc và tiền còn lại */}
                                            {(() => {
                                                const linkedRes = reservations.find(r => r.id_datBan === order.id_datBan);
                                                const hasPaidDeposit = linkedRes && linkedRes.trangThaiCoc === 'Đã cọc';
                                                const depositAmount = hasPaidDeposit ? Number(linkedRes.tienCoc || 0) : 0;
                                                const remainingAmount = Math.max(0, Number(order.tongTien || 0) - depositAmount);
                                                return (
                                                    <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '0.5rem', marginTop: '0.5rem', display: 'grid', gap: '0.15rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <span>Tổng hóa đơn món ăn:</span>
                                                            <strong style={{ color: 'var(--text)' }}>{Number(order.tongTien).toLocaleString('vi-VN')} ₫</strong>
                                                        </div>
                                                        {hasPaidDeposit && (
                                                            <>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                                                                    <span>Đã cọc trước (10% + giữ bàn):</span>
                                                                    <strong>-{depositAmount.toLocaleString('vi-VN')} ₫</strong>
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f97316', fontSize: '0.95rem' }}>
                                                                    <span>Số tiền còn lại cần trả:</span>
                                                                    <strong>{remainingAmount.toLocaleString('vi-VN')} ₫</strong>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <div style={{ marginTop: '0.9rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                            {order.tinhTrang !== 'Đã thanh toán' && order.tinhTrang !== 'Đã hủy' && (() => {
                                                const linkedRes = reservations.find(r => r.id_datBan === order.id_datBan);
                                                const hasPaidDeposit = linkedRes && linkedRes.trangThaiCoc === 'Đã cọc';
                                                const depositAmount = hasPaidDeposit ? Number(linkedRes.tienCoc || 0) : 0;
                                                const remainingAmount = Math.max(0, Number(order.tongTien || 0) - depositAmount);

                                                if (remainingAmount <= 0) {
                                                    return (
                                                        <span style={{
                                                            padding: '0.4rem 0.85rem',
                                                            borderRadius: '0.5rem',
                                                            background: 'rgba(16,185,129,0.12)',
                                                            border: '1px solid rgba(16,185,129,0.25)',
                                                            color: '#34d399',
                                                            fontSize: '0.85rem',
                                                            fontWeight: 'bold',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.35rem',
                                                            marginRight: 'auto'
                                                        }}>
                                                            ✓ Đã thanh toán 100% (Trả trước)
                                                        </span>
                                                    );
                                                }

                                                return (
                                                    <>
                                                        <button
                                                            onClick={() => handleVNPayPayment('donhang', order.id_donHang, remainingAmount)}
                                                            style={{
                                                                padding: '0.5rem 1rem',
                                                                fontSize: '0.875rem',
                                                                background: 'linear-gradient(135deg, #0066cc, #004fa3)',
                                                                color: '#fff',
                                                                border: 'none',
                                                                borderRadius: '0.5rem',
                                                                fontWeight: 'bold',
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '0.4rem',
                                                                boxShadow: '0 2px 8px rgba(0,102,204,0.3)',
                                                            }}
                                                            className="payment-btn-left"
                                                        >
                                                            {hasPaidDeposit ? `Thanh toán còn lại (${remainingAmount.toLocaleString('vi-VN')} ₫)` : `Thanh toán VNPay (${Number(order.tongTien).toLocaleString('vi-VN')} ₫)`}
                                                        </button>
                                                        <button
                                                            onClick={() => setQrModal({
                                                                amount: remainingAmount,
                                                                addInfo: `THANH TOAN DH${order.id_donHang}`,
                                                                label: `Thanh toán đơn hàng #${order.id_donHang}`
                                                            })}
                                                            style={{
                                                                padding: '0.5rem 1rem',
                                                                fontSize: '0.875rem',
                                                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                                                color: '#fff',
                                                                border: 'none',
                                                                borderRadius: '0.5rem',
                                                                fontWeight: 'bold',
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '0.4rem',
                                                                boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
                                                            }}
                                                        >
                                                            Quét mã VietQR ({remainingAmount.toLocaleString('vi-VN')} ₫)
                                                        </button>
                                                    </>
                                                );
                                            })()}
                                            <button className="btn btn-outline" onClick={() => handleViewOrder(order.id_donHang)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Eye size={16} /> Xem chi tiết
                                            </button>
                                            {(order.tinhTrang === 'Đang chờ món' || order.tinhTrang === 'Chờ khách đến') && (
                                                <button className="btn btn-primary" onClick={() => handleEditOrder(order)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <Edit3 size={16} /> Chỉnh sửa
                                                </button>
                                            )}
                                            {order.tinhTrang === 'Chờ khách đến' && !order.id_datBan && (
                                                <button className="btn btn-success" onClick={() => handleCheckinOrder(order.id_donHang)} disabled={checkinLoadingId === order.id_donHang} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#10b981', color: '#fff', border: 'none' }}>
                                                    <CheckCheck size={16} /> {checkinLoadingId === order.id_donHang ? 'Đang xử lý...' : 'Báo đã tới'}
                                                </button>
                                            )}
                                            {order.tinhTrang === 'Đã thanh toán' && (
                                                (() => {
                                                    const hasReview = reviews.some(r => r.id_donHang === order.id_donHang);
                                                    if (hasReview) {
                                                        const review = reviews.find(r => r.id_donHang === order.id_donHang);
                                                        return (
                                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 1rem', fontSize: '0.875rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '0.5rem', fontWeight: 'bold' }}>
                                                                <Star size={16} fill="#10b981" /> Đã đánh giá ({review.soSao}★)
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <button
                                                            className="btn"
                                                            onClick={() => {
                                                                setReviewForm({ id_donHang: order.id_donHang, soSao: 5, noiDung: '' });
                                                                setShowReviewModal(true);
                                                            }}
                                                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#eab308', color: '#000', border: 'none', fontWeight: 'bold' }}
                                                        >
                                                            <Star size={16} /> Đánh giá
                                                        </button>
                                                    );
                                                })()
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            {/* MODAL CHI TIẾT ĐƠN HÀNG */}
            {showOrderModal && (
                <div onClick={handleCloseOrderModal} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: '1rem', border: '1px solid var(--border)', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-light)' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Chi Tiết Đơn Hàng {selectedOrder ? `#DH${selectedOrder.id_donHang}` : ''}</h2>
                            <button onClick={handleCloseOrderModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}><X size={22} /></button>
                        </div>
                        <div style={{ overflowY: 'auto', padding: '1.5rem', flex: 1 }}>
                            {orderDetailLoading ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Đang tải chi tiết...</div>
                            ) : selectedOrder ? (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                        <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#a855f7' }}>
                                                <Star size={16} /><span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Nhân viên phục vụ</span>
                                            </div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{selectedOrder.tenNhanVienPhucVu || <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontStyle: 'italic' }}>Chưa phân công</span>}</div>
                                        </div>
                                        <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'var(--surface-light)', border: '1px solid var(--border)' }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Trạng thái</div>
                                            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.85rem', background: getStatusStyle(selectedOrder.tinhTrang).bg, color: getStatusStyle(selectedOrder.tinhTrang).color, fontWeight: 600 }}>{selectedOrder.tinhTrang}</span>
                                        </div>
                                    </div>
                                    {/* Bàn + Thời gian */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                        <div style={{ padding: '1rem', borderRadius: '0.75rem', background: selectedOrder.id_ban ? 'rgba(16,185,129,0.12)' : 'var(--surface-light)', border: `1px solid ${selectedOrder.id_ban ? 'rgba(16,185,129,0.4)' : 'var(--border)'}` }}>
                                            <div style={{ fontSize: '0.8rem', color: selectedOrder.id_ban ? '#059669' : 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                🪑 BÀN NGỒI
                                            </div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.4rem', color: selectedOrder.id_ban ? '#059669' : 'var(--text-muted)' }}>
                                                {selectedOrder.id_ban ? `Bàn số ${selectedOrder.id_ban}` : 'Mang về'}
                                            </div>
                                        </div>
                                        <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'var(--surface-light)', border: '1px solid var(--border)' }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Thời gian tạo đơn</div>
                                            <div style={{ fontWeight: 'bold' }}>{formatDateTime(selectedOrder.thoiGianTao)}</div>
                                        </div>
                                    </div>
                                    {selectedOrder.thoiGianDen && (
                                        <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(249, 115, 22, 0.08)', border: '1px solid rgba(249, 115, 22, 0.2)', marginBottom: '1.5rem' }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '0.25rem', fontWeight: 600 }}>🕐 Thời gian dự kiến tới</div>
                                            <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{formatDateTime(selectedOrder.thoiGianDen)}</div>
                                        </div>
                                    )}
                                    {selectedOrder.id_datBan && (
                                        <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <div>
                                                <div style={{ fontSize: '0.8rem', color: '#059669', marginBottom: '0.25rem', fontWeight: 600 }}>Đã liên kết lịch đặt bàn</div>
                                                <div style={{ fontWeight: 'bold', color: '#059669' }}>Mã đặt bàn: #{selectedOrder.id_datBan}</div>
                                            </div>
                                            <button
                                                className="btn btn-outline"
                                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: '#059669', borderColor: '#10b981' }}
                                                onClick={() => {
                                                    setShowOrderModal(false);
                                                    const res = reservations.find(r => r.id_datBan === selectedOrder.id_datBan);
                                                    if (res) {
                                                        setSelectedReservation(res);
                                                        setShowReservationModal(true);
                                                    } else {
                                                        alert("Không tìm thấy thông tin chi tiết đặt bàn!");
                                                    }
                                                }}
                                            >
                                                Xem chi tiết đặt bàn
                                            </button>
                                        </div>
                                    )}
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><UtensilsCrossed size={18} style={{ color: '#f97316' }} />Danh sách món ăn</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {selectedOrder.chi_tiet && selectedOrder.chi_tiet.length > 0 ? selectedOrder.chi_tiet.map((item) => (
                                                <div key={item.id_chiTietDonHang} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '1rem', alignItems: 'center', padding: '1rem', borderRadius: '0.75rem', background: 'var(--surface-light)', border: '1px solid var(--border)' }}>
                                                    <div style={{ width: '52px', height: '52px', borderRadius: '0.5rem', overflow: 'hidden', background: 'var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {item.hinhAnhMon ? <img src={`${BASE_URL}${item.hinhAnhMon}`} alt={item.tenMon} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} /> : <span style={{ fontSize: '1.5rem' }}></span>}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{item.tenMon || `Món #${item.id_monAn}`}</div>
                                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SL: <strong style={{ color: 'var(--text)' }}>{item.soLuong}</strong></span>
                                                            <span style={{ fontSize: '0.8rem' }}>Trạng thái: <strong style={{ color: getMonStatusColor(item.trangThaiMon) }}>{item.trangThaiMon}</strong></span>
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                        <div style={{ fontWeight: 'bold', color: '#f97316', fontSize: '0.95rem' }}>{formatCurrency(item.giaTaiThoiDiemBan * item.soLuong)}</div>
                                                    </div>
                                                </div>
                                            )) : <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>Không có món nào.</div>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(234,179,8,0.08))', border: '1px solid rgba(249,115,22,0.3)' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Tổng tiền</span>
                                        <span style={{ fontWeight: 'bold', fontSize: '1.4rem', color: '#f97316' }}>{formatCurrency(selectedOrder.tongTien)}</span>
                                    </div>
                                </>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CHI TIẾT ĐẶT BÀN */}
            {showReservationModal && selectedReservation && (() => {
                const linkedOrder = orders.find(o => o.id_datBan === selectedReservation.id_datBan);
                return (
                    <div onClick={handleCloseReservationModal} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: '1rem', border: '1px solid var(--border)', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
                            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-light)' }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Chi Tiết Đặt Bàn #{selectedReservation.id_datBan}</h2>
                                <button onClick={handleCloseReservationModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}><X size={22} /></button>
                            </div>
                            <div style={{ padding: '1.5rem', display: 'grid', gap: '1rem', overflowY: 'auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px dashed var(--border)' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Trạng thái</span>
                                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', background: getStatusStyle(selectedReservation.trangThai).bg, color: getStatusStyle(selectedReservation.trangThai).color, fontSize: '0.875rem', fontWeight: 'bold' }}>{selectedReservation.trangThai}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px dashed var(--border)' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Bàn</span>
                                    <strong>{selectedReservation.id_ban ? `Bàn ${selectedReservation.id_ban}` : 'Chưa xếp'}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px dashed var(--border)' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Thời gian đến</span>
                                    <strong>{formatDateTime(selectedReservation.thoiGianDen)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px dashed var(--border)' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Đến thực tế</span>
                                    <strong>{formatDateTime(selectedReservation.thoiGianDenThucTe)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px dashed var(--border)' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Số người</span>
                                    <strong>{selectedReservation.soNguoi}</strong>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '0.75rem', borderBottom: '1px dashed var(--border)' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Ghi chú</span>
                                    <div style={{ padding: '1rem', background: 'var(--surface-light)', borderRadius: '0.5rem', border: '1px solid var(--border)', minHeight: '60px' }}>
                                        {selectedReservation.ghiChu || <em style={{ color: 'var(--text-muted)' }}>Không có ghi chú</em>}
                                    </div>
                                </div>
                                {linkedOrder && (
                                    <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '0.75rem', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.8rem', color: '#2563eb', marginBottom: '0.25rem', fontWeight: 600 }}>Đã đặt món ăn đi kèm</div>
                                            <div style={{ fontWeight: 'bold', color: '#2563eb' }}>Đơn hàng: #{linkedOrder.id_donHang}</div>
                                        </div>
                                        <button
                                            className="btn btn-outline"
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: '#2563eb', borderColor: '#3b82f6' }}
                                            onClick={() => {
                                                setShowReservationModal(false);
                                                handleViewOrder(linkedOrder.id_donHang);
                                            }}
                                        >
                                            Xem đơn món
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* MODAL ĐÁNH GIÁ ĐƠN HÀNG */}
            {showReviewModal && (
                <div onClick={() => setShowReviewModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: '1rem', border: '1px solid var(--border)', width: '100%', maxWidth: '450px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-light)' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Đánh Giá Đơn Hàng #{reviewForm.id_donHang}</h2>
                            <button onClick={() => setShowReviewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={22} /></button>
                        </div>
                        <form onSubmit={handleSubmittingReview} style={{ padding: '1.5rem', display: 'grid', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text)' }}>Số sao đánh giá</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            type="button"
                                            key={star}
                                            onClick={() => setReviewForm({ ...reviewForm, soSao: star })}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: star <= reviewForm.soSao ? '#eab308' : 'var(--border)' }}
                                        >
                                            <Star size={32} fill={star <= reviewForm.soSao ? '#eab308' : 'none'} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text)' }}>Bình luận / Ý kiến đóng góp</label>
                                <textarea
                                    className="input-field"
                                    placeholder="Chia sẻ trải nghiệm của bạn về món ăn và dịch vụ..."
                                    rows={4}
                                    value={reviewForm.noiDung}
                                    onChange={(e) => setReviewForm({ ...reviewForm, noiDung: e.target.value })}
                                    required
                                    style={{ width: '100%', resize: 'none', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--surface-light)', color: 'var(--text)' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowReviewModal(false)}>Hủy</button>
                                <button type="submit" className="btn btn-primary" disabled={isSubmittingReview} style={{ background: '#eab308', color: '#000', borderColor: '#eab308' }}>
                                    {isSubmittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL THANH TOÁN QR CODE DÀNH CHO KHÁCH HÀNG */}
            {qrModal && (
                <div onClick={() => setQrModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: '1.25rem', border: '1px solid var(--border)', width: '100%', maxWidth: '480px', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', color: 'var(--text)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                        {/* Header */}
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-light)' }}>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                Thanh toán qua VietQR
                            </h2>
                            <button onClick={() => setQrModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={22} /></button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {qrModal.label}
                            </div>

                            {/* QR Code Container */}
                            <div style={{ background: '#fff', padding: '1rem', borderRadius: '1rem', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', width: '240px', height: '240px' }}>
                                <img
                                    src={`https://img.vietqr.io/image/970419-9704198526191432198-compact.png?amount=${qrModal.amount}&addInfo=${encodeURIComponent(qrModal.addInfo)}&accountName=NGUYEN%20VAN%20A`}
                                    alt="Mã QR Thanh Toán VietQR"
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                            </div>

                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0, maxWidth: '340px' }}>
                                Mở ứng dụng ngân hàng bất kỳ của bạn, quét mã QR này để tự động điền đầy đủ số tiền &amp; nội dung chuyển khoản.
                            </p>

                            {/* Details List */}
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--surface-light)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '0.75rem', fontSize: '0.9rem' }}>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Chủ tài khoản:</span>
                                    <strong style={{ color: 'var(--text)' }}>NGUYEN VAN A</strong>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border)', paddingTop: '0.6rem' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Số tài khoản:</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <strong style={{ color: 'var(--text)' }}>9704198526191432198</strong>
                                        <button
                                            onClick={() => handleCopyText('9704198526191432198', 'stk')}
                                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '0.25rem', padding: '0.15rem 0.3rem', fontSize: '0.7rem', cursor: 'pointer' }}
                                        >
                                            {copiedField === 'stk' ? '✓ Đã chép' : 'Sao chép'}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border)', paddingTop: '0.6rem' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ngân hàng:</span>
                                    <strong style={{ color: 'var(--text)' }}>NCB (TMCP Quốc Dân)</strong>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border)', paddingTop: '0.6rem' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Số tiền chuyển:</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <strong style={{ color: '#f97316', fontSize: '1rem' }}>{formatCurrency(qrModal.amount)}</strong>
                                        <button
                                            onClick={() => handleCopyText(qrModal.amount.toString(), 'amount')}
                                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '0.25rem', padding: '0.15rem 0.3rem', fontSize: '0.7rem', cursor: 'pointer' }}
                                        >
                                            {copiedField === 'amount' ? '✓ Đã chép' : 'Sao chép'}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border)', paddingTop: '0.6rem' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nội dung chuyển:</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <strong style={{ color: 'var(--text)', fontSize: '0.85rem', wordBreak: 'break-all' }}>{qrModal.addInfo}</strong>
                                        <button
                                            onClick={() => handleCopyText(qrModal.addInfo, 'info')}
                                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '0.25rem', padding: '0.15rem 0.3rem', fontSize: '0.7rem', cursor: 'pointer' }}
                                        >
                                            {copiedField === 'info' ? '✓ Đã chép' : 'Sao chép'}
                                        </button>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '1rem 1.5rem', background: 'var(--surface-light)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setQrModal(null)} className="btn btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', fontWeight: 'bold' }}>
                                Đã chuyển khoản xong
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerDashboardPage;