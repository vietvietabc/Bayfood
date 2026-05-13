import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { CalendarDays, ClipboardList, Clock3, LogIn, MapPin, UtensilsCrossed, UserCircle2, MapPinned, Bell, CheckCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BASE_URL = 'http://localhost:8000';

const formatDateTime = (value) => {
    if (!value) {
        return 'Chưa cập nhật';
    }

    return new Date(value).toLocaleString('vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
};

const getStatusStyle = (status) => {
    const mapping = {
        'Chờ xác nhận': { bg: 'rgba(234, 179, 8, 0.12)', color: '#ca8a04' },
        'Đã đặt': { bg: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' },
        'Đã xác nhận': { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669' },
        'Đã checkin': { bg: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed' },
        'Đã hủy': { bg: 'rgba(239, 68, 68, 0.12)', color: '#dc2626' },
        'Đang chờ món': { bg: 'rgba(234, 179, 8, 0.12)', color: '#ca8a04' },
        'Đang chế biến': { bg: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' },
        'Đã phục vụ': { bg: 'rgba(168, 85, 247, 0.12)', color: '#7c3aed' },
        'Đã thanh toán': { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669' },
    };

    return mapping[status] || { bg: 'var(--surface-light)', color: 'var(--text-muted)' };
};

const CustomerDashboardPage = () => {
    const { user, loading: authLoading } = useAuth();
    const [reservations, setReservations] = useState([]);
    const [orders, setOrders] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [checkinLoadingId, setCheckinLoadingId] = useState(null);
    const [actionMessage, setActionMessage] = useState('');

    useEffect(() => {
        const fetchCustomerData = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            setLoading(true);
            setError('');

            try {
                const [reservationRes, orderRes, notificationRes, unreadCountRes] = await Promise.all([
                    axios.get(`${BASE_URL}/api/datban/me`),
                    axios.get(`${BASE_URL}/api/donhang/me`),
                    axios.get(`${BASE_URL}/api/thongbao/me`),
                    axios.get(`${BASE_URL}/api/thongbao/me/unread-count`),
                ]);

                setReservations(reservationRes.data || []);
                setOrders(orderRes.data || []);
                setNotifications(notificationRes.data || []);
                setUnreadCount(unreadCountRes.data?.count || 0);
            } catch (fetchError) {
                console.error('Failed to load customer dashboard', fetchError);
                setError('Không thể tải dữ liệu khách hàng. Vui lòng thử lại sau.');
            } finally {
                setLoading(false);
            }
        };

        fetchCustomerData();
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

        try {
            await axios.post(`${BASE_URL}/api/datban/${reservationId}/checkin`);
            setActionMessage('Check-in thành công. Admin đã nhận thông báo bàn của bạn đã tới nơi.');

            const response = await axios.get(`${BASE_URL}/api/datban/me`);
            setReservations(response.data || []);
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
            const [notificationRes, unreadCountRes] = await Promise.all([
                axios.get(`${BASE_URL}/api/thongbao/me`),
                axios.get(`${BASE_URL}/api/thongbao/me/unread-count`),
            ]);

            setNotifications(notificationRes.data || []);
            setUnreadCount(unreadCountRes.data?.count || 0);
        } catch (notificationError) {
            console.error('Failed to mark notification as read', notificationError);
        }
    };

    return (
        <div className="container py-8">
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

            <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
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
            </div>

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
                                        </div>

                                        {reservation.trangThai === 'Đã xác nhận' && (
                                            <div style={{ marginTop: '0.9rem', display: 'flex', justifyContent: 'flex-end' }}>
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
                                            <span>Đặt bàn liên quan: {order.id_datBan || 'Không'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default CustomerDashboardPage;