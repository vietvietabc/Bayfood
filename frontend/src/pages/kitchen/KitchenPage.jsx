import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ITEM_STATUS_FLOW = ['Chờ chế biến', 'Đang chế biến', 'Hoàn thành'];

const getItemStatusStyle = (status) => {
    switch (status) {
        case 'Chờ chế biến':
            return { bg: 'rgba(234, 179, 8, 0.12)', color: '#ca8a04', border: '1px solid rgba(234,179,8,0.3)', label: 'Chờ chế biến' };
        case 'Đang chế biến':
            return { bg: 'rgba(249, 115, 22, 0.12)', color: '#ea580c', border: '1px solid rgba(94,106,210,0.3)', label: 'Đang chế biến' };
        case 'Hoàn thành':
            return { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)', label: 'Hoàn thành' };
        default:
            return { bg: 'var(--surface-soft)', color: 'var(--muted)', border: '1px solid var(--hairline)', label: status };
    }
};

const getOrderStatusStyle = (status) => {
    switch (status) {
        case 'Đang chờ món': return { bg: 'rgba(234,179,8,0.12)', color: '#ca8a04' };
        case 'Đang chế biến': return { bg: 'rgba(94,106,210,0.12)', color: '#ea580c' };
        default: return { bg: 'var(--surface-soft)', color: 'var(--muted)' };
    }
};

const formatTime = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const getElapsedMinutes = (thoiGianTao) => {
    if (!thoiGianTao) return 0;
    return Math.floor((Date.now() - new Date(thoiGianTao).getTime()) / 60000);
};

const KitchenPage = () => {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Lịch sử & Tabs state
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
    const [historyOrders, setHistoryOrders] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Ca lam viec state
    const [shiftData, setShiftData] = useState(null);
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [selectedShift, setSelectedShift] = useState('Ca sáng');
    const [shiftLoading, setShiftLoading] = useState(false);

    // Custom Checkout Modal state
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [checkoutReason, setCheckoutReason] = useState('');
    const [isEarlyCheckout, setIsEarlyCheckout] = useState(false);
    const [earlyCheckoutError, setEarlyCheckoutError] = useState('');
    const [personalShifts, setPersonalShifts] = useState([]);
    const [personalShiftsLoading, setPersonalShiftsLoading] = useState(false);

    const fetchOrders = useCallback(async () => {
        try {
            const res = await axios.get(`${BASE_URL}/api/donhang/kitchen/active`);
            setOrders(res.data);
            setLastRefresh(new Date());
        } catch (err) {
            console.error('Lỗi tải đơn bếp:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const res = await axios.get(`${BASE_URL}/api/donhang/kitchen/history`);
            setHistoryOrders(res.data);
        } catch (err) {
            console.error('Lỗi tải lịch sử bếp:', err);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    const fetchShiftData = useCallback(async () => {
        try {
            const res = await axios.get(`${BASE_URL}/api/donhang/kitchen/shift`);
            setShiftData(res.data);
        } catch (err) {
            console.error('Lỗi tải ca làm việc:', err);
        }
    }, []);

    const fetchPersonalShifts = useCallback(async () => {
        setPersonalShiftsLoading(true);
        try {
            const res = await axios.get(`${BASE_URL}/api/users/me/shift-history`);
            setPersonalShifts(res.data);
        } catch (err) {
            console.error('Lỗi tải lịch sử ca bếp:', err);
        } finally {
            setPersonalShiftsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && user) {
            fetchOrders();
            fetchShiftData();
        }
    }, [user, authLoading, fetchOrders, fetchShiftData]);

    // Auto-refresh active orders every 20 seconds only when on the active tab
    useEffect(() => {
        if (!autoRefresh || activeTab !== 'active') return;
        const interval = setInterval(fetchOrders, 20000);
        return () => clearInterval(interval);
    }, [autoRefresh, activeTab, fetchOrders]);

    const handleShiftCheckIn = async () => {
        setShiftLoading(true);
        try {
            const res = await axios.post(`${BASE_URL}/api/donhang/kitchen/shift/checkin`);
            setShiftData(prev => ({
                ...prev,
                caLamViec: res.data.caLamViec,
                trangThai: res.data.trangThai
            }));
            setShowShiftModal(false);
        } catch (err) {
            alert(err.response?.data?.detail || 'Không thể check-in ca làm việc');
        } finally {
            setShiftLoading(false);
        }
    };

    const handleShiftCheckOut = () => {
        let isEarly = false;
        if (shiftData && shiftData.caLamViec) {
            const now = new Date();
            const hour = now.getHours();
            const min = now.getMinutes();
            const currentTotalMin = hour * 60 + min;

            let endHour = 12; // Mặc định Ca sáng
            if (shiftData.caLamViec === 'Ca chiều') endHour = 17;
            else if (shiftData.caLamViec === 'Ca tối') endHour = 22;

            const endTotalMin = endHour * 60;

            if (currentTotalMin < endTotalMin) {
                isEarly = true;
            }
        }

        setIsEarlyCheckout(isEarly);
        setCheckoutReason('');
        setEarlyCheckoutError('');
        setShowCheckoutModal(true);
    };

    const submitShiftCheckOut = async () => {
        let lyDo = null;
        if (isEarlyCheckout) {
            if (!checkoutReason.trim()) {
                setEarlyCheckoutError('Bạn phải nhập lý do tan ca sớm để hoàn tất checkout.');
                return;
            }
            lyDo = checkoutReason.trim();
        }

        setShiftLoading(true);
        try {
            const res = await axios.post(`${BASE_URL}/api/donhang/kitchen/shift/checkout`, {
                lyDoTanCaSom: lyDo
            });
            setShiftData(prev => ({
                ...prev,
                trangThai: res.data.trangThai
            }));
            setShowCheckoutModal(false);
            if (activeTab === 'shifts') fetchPersonalShifts();
        } catch (err) {
            alert(err.response?.data?.detail || 'Không thể tan ca làm việc');
        } finally {
            setShiftLoading(false);
        }
    };

    const handleNextStatus = async (id_chiTiet, currentStatus) => {
        const currentIdx = ITEM_STATUS_FLOW.indexOf(currentStatus);
        if (currentIdx === -1 || currentIdx >= ITEM_STATUS_FLOW.length - 1) return;
        const nextStatus = ITEM_STATUS_FLOW[currentIdx + 1];

        setUpdatingId(id_chiTiet);
        try {
            await axios.put(`${BASE_URL}/api/donhang/kitchen/item/${id_chiTiet}/status`, {
                trangThaiMon: nextStatus,
            });
            await fetchOrders();
        } catch (err) {
            alert(err.response?.data?.detail || 'Không thể cập nhật trạng thái');
        } finally {
            setUpdatingId(null);
        }
    };

    if (authLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '42px', height: '42px', border: '4px solid var(--hairline)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="container py-16" style={{ textAlign: 'center' }}>
                <h2>Vui lòng đăng nhập để truy cập khu vực bếp</h2>
                <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/login')}>
                    Đăng nhập
                </button>
            </div>
        );
    }

    const pendingCount = orders.reduce((sum, o) =>
        sum + o.chi_tiet.filter(i => i.trangThaiMon === 'Chờ chế biến').length, 0);
    const cookingCount = orders.reduce((sum, o) =>
        sum + o.chi_tiet.filter(i => i.trangThaiMon === 'Đang chế biến').length, 0);
    const doneCount = orders.reduce((sum, o) =>
        sum + o.chi_tiet.filter(i => i.trangThaiMon === 'Hoàn thành').length, 0);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--canvas)', padding: '0' }}>
            {/* Sub-header bar: ca làm việc + stats + controls */}
            <div style={{
                background: 'var(--canvas)',
                borderBottom: '1px solid rgba(94,106,210,0.18)',
                padding: '0.6rem 2rem',
                position: 'sticky',
                top: '60px',
                zIndex: 40,
                backdropFilter: 'blur(8px)',
            }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {/* Ca làm việc */}
                    {shiftData && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {shiftData.trangThai === 'Đang làm' ? (
                                <>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', borderRadius: 'var(--rounded-pill)', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#34d399', fontSize: '0.78rem', fontWeight: '700' }}>
                                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
                                        {shiftData.caLamViec}
                                    </span>
                                    <button onClick={handleShiftCheckOut} disabled={shiftLoading} style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--rounded-pill)', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}>
                                        Tan Ca
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', borderRadius: 'var(--rounded-pill)', background: 'var(--surface-soft)', border: '1px solid var(--hairline)', color: 'var(--muted)', fontSize: '0.78rem', fontWeight: '600' }}>
                                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'inline-block' }} />
                                        Chưa vào ca
                                    </span>
                                    <button onClick={() => setShowShiftModal(true)} disabled={shiftLoading} style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--rounded-pill)', border: '1px solid rgba(94,106,210,0.5)', background: 'rgba(94,106,210,0.15)', color: '#fb923c', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}>
                                        Vào Ca
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Stats + Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--rounded-pill)', background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.3)', color: '#fbbf24', fontSize: '0.78rem', fontWeight: '700' }}>
                            {pendingCount} chờ
                        </div>
                        <div style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--rounded-pill)', background: 'rgba(94,106,210,0.15)', border: '1px solid rgba(94,106,210,0.3)', color: '#fb923c', fontSize: '0.78rem', fontWeight: '700' }}>
                            {cookingCount} đang làm
                        </div>
                        <div style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--rounded-pill)', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', fontSize: '0.78rem', fontWeight: '700' }}>
                            {doneCount} xong
                        </div>
                        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 0.25rem' }} />
                        <button onClick={() => setAutoRefresh(v => !v)} style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--rounded-pill)', border: `1px solid ${autoRefresh ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.12)'}`, background: autoRefresh ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)', color: autoRefresh ? '#34d399' : 'rgba(255,255,255,0.35)', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
                            {autoRefresh ? '● Auto ON' : '○ Auto OFF'}
                        </button>
                        <button onClick={fetchOrders} style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--rounded-pill)', border: '1px solid rgba(94,106,210,0.4)', background: 'rgba(94,106,210,0.12)', color: '#fb923c', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}>
                            Làm mới · {formatTime(lastRefresh)}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem 2rem' }}>


                {/* Tab Selector */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <button
                        onClick={() => setActiveTab('active')}
                        style={{
                            padding: '0.55rem 1.4rem',
                            borderRadius: 'var(--rounded-pill)',
                            border: activeTab === 'active' ? 'none' : '1px solid var(--hairline)',
                            background: activeTab === 'active' ? 'var(--primary)' : 'var(--surface-card)',
                            color: activeTab === 'active' ? '#fff' : 'var(--muted)',
                            fontWeight: '700',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: activeTab === 'active' ? '0 4px 14px rgba(94,106,210,0.3)' : 'none',
                        }}
                    >
                        Đang chế biến ({orders.length})
                    </button>
                    <button
                        onClick={() => { setActiveTab('history'); fetchHistory(); }}
                        style={{
                            padding: '0.55rem 1.4rem',
                            borderRadius: 'var(--rounded-pill)',
                            border: activeTab === 'history' ? 'none' : '1px solid var(--hairline)',
                            background: activeTab === 'history' ? 'var(--primary)' : 'var(--surface-card)',
                            color: activeTab === 'history' ? '#fff' : 'var(--muted)',
                            fontWeight: '700',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: activeTab === 'history' ? '0 4px 14px rgba(94,106,210,0.3)' : 'none',
                        }}
                    >
                        Lịch sử đơn
                    </button>
                    <button
                        onClick={() => { setActiveTab('shifts'); fetchPersonalShifts(); }}
                        style={{
                            padding: '0.55rem 1.4rem',
                            borderRadius: 'var(--rounded-pill)',
                            border: activeTab === 'shifts' ? 'none' : '1px solid var(--hairline)',
                            background: activeTab === 'shifts' ? 'var(--primary)' : 'var(--surface-card)',
                            color: activeTab === 'shifts' ? '#fff' : 'var(--muted)',
                            fontWeight: '700',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: activeTab === 'shifts' ? '0 4px 14px rgba(94,106,210,0.3)' : 'none',
                        }}
                    >
                        Lịch sử ca làm
                    </button>
                </div>

                {activeTab === 'active' && (
                    <>
                        {/* Off-duty banner alert */}
                        {shiftData && shiftData.trangThai !== 'Đang làm' && (
                            <div style={{
                                padding: '2.5rem 2rem',
                                textAlign: 'center',
                                background: 'linear-gradient(135deg, rgba(249,115,22,0.06), rgba(255,255,255,1))',
                                border: '1px solid rgba(94,106,210,0.2)',
                                borderRadius: 'var(--rounded-lg)',
                                marginBottom: '2rem',
                                boxShadow: 'none',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '50%',
                                    background: 'rgba(94, 106, 210, 0.1)',
                                    color: 'var(--primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '2rem',
                                    marginBottom: '1rem'
                                }}>

                                </div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 0.5rem', color: 'var(--ink)' }}>
                                    Chào đầu bếp {user.hoTen}! Bạn đang ở trạng thái nghỉ
                                </h2>
                                <p style={{ color: 'var(--muted)', maxWidth: '540px', margin: '0 0 1.5rem', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                    Vui lòng chọn ca và bấm <strong>"Vào Ca"</strong> để thông báo cho hệ thống rằng bạn đã sẵn sàng làm việc và bắt đầu nấu nướng các món ăn ngon!
                                </p>
                                <button
                                    onClick={() => setShowShiftModal(true)}
                                    className="btn btn-primary"
                                    style={{ padding: '0.75rem 2rem', fontSize: '0.95rem', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(94,106,210,0.2)' }}
                                >
                                    Chọn Ca & Bắt Đầu Làm Việc
                                </button>
                            </div>
                        )}

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
                                <div style={{ width: '48px', height: '48px', border: '4px solid var(--hairline)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                                Đang tải danh sách đơn bếp...
                            </div>
                        ) : orders.length === 0 ? (
                            <div style={{
                                textAlign: 'center', padding: '5rem 2rem',
                                borderRadius: 'var(--rounded-lg)', border: '2px dashed var(--hairline)',
                                background: 'var(--surface-card)',
                            }}>
                                <h2 style={{ margin: '0 0 0.5rem', color: 'var(--ink)' }}>Không có đơn nào trong bếp</h2>
                                <p style={{ color: 'var(--muted)' }}>Tất cả các đơn hàng đã được phục vụ hoặc chưa có đơn mới.</p>
                            </div>
                        ) : (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                                gap: '1.25rem',
                            }}>
                                {orders.map(order => {
                                    const elapsed = getElapsedMinutes(order.thoiGianTao);
                                    const isUrgent = elapsed >= 20;
                                    const orderStyle = getOrderStatusStyle(order.tinhTrang);
                                    const allDone = order.chi_tiet.every(i => i.trangThaiMon === 'Hoàn thành');

                                    return (
                                        <div
                                            key={order.id_donHang}
                                            style={{
                                                background: 'var(--surface-card)',
                                                borderRadius: 'var(--rounded-xl)',
                                                border: isUrgent ? '1.5px solid rgba(239,68,68,0.6)' : allDone ? '1.5px solid rgba(16,185,129,0.4)' : '1px solid var(--hairline)',
                                                boxShadow: 'none',
                                                overflow: 'hidden',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                transition: 'box-shadow 0.25s, border-color 0.25s',
                                            }}
                                        >
                                            {/* Order Card Header */}
                                            <div style={{
                                                padding: '1rem 1.25rem',
                                                background: allDone
                                                    ? 'rgba(16,185,129,0.08)'
                                                    : isUrgent
                                                        ? 'rgba(239,68,68,0.08)'
                                                        : 'var(--surface-soft)',
                                                borderBottom: '1px solid var(--hairline)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                flexWrap: 'wrap',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                    <span style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>
                                                        {order.id_ban ? `Bàn ${order.id_ban}` : 'Mang về'}
                                                    </span>
                                                    <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                                                        #{order.id_donHang}
                                                    </span>
                                                </div>

                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    {isUrgent && !allDone && (
                                                        <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 'bold' }}>
                                                            Trễ!
                                                        </span>
                                                    )}
                                                    <span style={{
                                                        padding: '0.2rem 0.6rem',
                                                        borderRadius: 'var(--rounded-pill)',
                                                        fontSize: '0.8rem',
                                                        background: orderStyle.bg,
                                                        color: orderStyle.color,
                                                        fontWeight: 600,
                                                    }}>
                                                        {order.tinhTrang}
                                                    </span>
                                                    <span style={{
                                                        fontSize: '0.8rem',
                                                        color: isUrgent ? '#dc2626' : 'var(--muted)',
                                                        fontWeight: isUrgent ? 'bold' : 'normal',
                                                    }}>
                                                        {elapsed} phút
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Items list */}
                                            <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
                                                {order.chi_tiet.map(item => {
                                                    const style = getItemStatusStyle(item.trangThaiMon);
                                                    const isUpdating = updatingId === item.id_chiTietDonHang;
                                                    const isDone = item.trangThaiMon === 'Hoàn thành';
                                                    const nextIdx = ITEM_STATUS_FLOW.indexOf(item.trangThaiMon) + 1;
                                                    const nextLabel = nextIdx < ITEM_STATUS_FLOW.length ? ITEM_STATUS_FLOW[nextIdx] : null;

                                                    return (
                                                        <div
                                                            key={item.id_chiTietDonHang}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.75rem',
                                                                padding: '0.75rem',
                                                                borderRadius: 'var(--rounded-md)',
                                                                background: style.bg,
                                                                border: style.border,
                                                                transition: 'all 0.2s',
                                                            }}
                                                        >
                                                            {/* Food image */}
                                                            <div style={{
                                                                width: '44px', height: '44px', borderRadius: '0.5rem',
                                                                overflow: 'hidden', flexShrink: 0,
                                                                background: 'var(--hairline)',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            }}>
                                                                {item.hinhAnh ? (
                                                                    <img
                                                                        src={`${BASE_URL}${item.hinhAnh}`}
                                                                        alt={item.tenMon}
                                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                        onError={e => { e.target.style.display = 'none'; }}
                                                                    />
                                                                ) : (
                                                                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Ảnh</span>
                                                                )}
                                                            </div>

                                                            {/* Name + status */}
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{
                                                                    fontWeight: 'bold',
                                                                    fontSize: '0.95rem',
                                                                    marginBottom: '0.2rem',
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                }}>
                                                                    {item.tenMon}
                                                                    <span style={{
                                                                        marginLeft: '0.5rem',
                                                                        fontWeight: 'normal',
                                                                        color: 'var(--muted)',
                                                                        fontSize: '0.85rem',
                                                                    }}>
                                                                        x{item.soLuong}
                                                                    </span>
                                                                </div>
                                                                <span style={{
                                                                    fontSize: '0.78rem',
                                                                    fontWeight: '600',
                                                                    color: style.color,
                                                                }}>
                                                                    {style.label}
                                                                </span>
                                                            </div>

                                                            {/* Action button */}
                                                            {!isDone && nextLabel && (
                                                                <button
                                                                    onClick={() => {
                                                                        if (shiftData && shiftData.trangThai !== 'Đang làm') {
                                                                            alert('Vui lòng "Vào Ca" làm việc trước khi thực hiện chế biến món ăn.');
                                                                            setShowShiftModal(true);
                                                                            return;
                                                                        }
                                                                        handleNextStatus(item.id_chiTietDonHang, item.trangThaiMon);
                                                                    }}
                                                                    disabled={isUpdating}
                                                                    style={{
                                                                        flexShrink: 0,
                                                                        padding: '0.45rem 1rem',
                                                                        borderRadius: 'var(--rounded-pill)',
                                                                        border: 'none',
                                                                        cursor: isUpdating ? 'not-allowed' : 'pointer',
                                                                        background: item.trangThaiMon === 'Chờ chế biến'
                                                                            ? 'var(--primary)'
                                                                            : 'var(--brand-teal)',
                                                                        color: 'var(--ink)',
                                                                        fontWeight: '700',
                                                                        fontSize: '0.78rem',
                                                                        letterSpacing: '0.02em',
                                                                        opacity: isUpdating ? 0.6 : 1,
                                                                        boxShadow: item.trangThaiMon === 'Chờ chế biến'
                                                                            ? '0 4px 12px rgba(94,106,210,0.35)'
                                                                            : '0 4px 12px rgba(16,185,129,0.35)',
                                                                        transition: 'all 0.2s',
                                                                    }}
                                                                >
                                                                    {isUpdating ? '...' : item.trangThaiMon === 'Chờ chế biến' ? 'Bắt đầu' : 'Hoàn thành'}
                                                                </button>
                                                            )}
                                                            {isDone && (
                                                                <div style={{
                                                                    flexShrink: 0,
                                                                    padding: '0.4rem 0.75rem',
                                                                    borderRadius: '0.5rem',
                                                                    background: 'rgba(16,185,129,0.15)',
                                                                    color: '#059669',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: 'bold',
                                                                }}>
                                                                    Xong
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Card footer */}
                                            <div style={{
                                                padding: '0.75rem 1.25rem',
                                                borderTop: '1px solid var(--hairline)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                background: 'var(--surface-soft)',
                                                fontSize: '0.8rem',
                                                color: 'var(--muted)',
                                            }}>
                                                <span>Gọi lúc {formatTime(order.thoiGianTao)}</span>
                                                <span>
                                                    {order.chi_tiet.filter(i => i.trangThaiMon === 'Hoàn thành').length}
                                                    /{order.chi_tiet.length} món xong
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'history' && (
                    historyLoading ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
                            <div style={{ width: '48px', height: '48px', border: '4px solid var(--hairline)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                            Đang tải lịch sử đơn hàng đã làm...
                        </div>
                    ) : historyOrders.length === 0 ? (
                        <div style={{
                            textAlign: 'center', padding: '5rem 2rem',
                            borderRadius: 'var(--rounded-lg)', border: '2px dashed var(--hairline)',
                            background: 'var(--surface-card)',
                        }}>
                            <h2 style={{ margin: '0 0 0.5rem', color: 'var(--ink)' }}>Chưa làm đơn hàng nào</h2>
                            <p style={{ color: 'var(--muted)' }}>Bạn chưa hoàn thành chế biến món ăn nào hoặc chưa có đơn hàng nào hoàn thành gần đây.</p>
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                            gap: '1.25rem',
                        }}>
                            {historyOrders.map(order => (
                                <div
                                    key={order.id_donHang}
                                    style={{
                                        background: 'var(--surface-card)',
                                        borderRadius: 'var(--rounded-lg)',
                                        border: order.hasCookedItem ? '1.5px solid rgba(16,185,129,0.3)' : '1px solid var(--hairline)',
                                        boxShadow: 'none',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        transition: 'all 0.2s',
                                        position: 'relative'
                                    }}
                                >
                                    {order.hasCookedItem && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '12px',
                                            right: '12px',
                                            padding: '0.25rem 0.5rem',
                                            background: 'rgba(16,185,129,0.1)',
                                            border: '1px solid rgba(16,185,129,0.3)',
                                            color: '#059669',
                                            borderRadius: '0.35rem',
                                            fontSize: '0.68rem',
                                            fontWeight: 'bold',
                                            zIndex: 2
                                        }}>
                                            Đã hoàn thành
                                        </div>
                                    )}

                                    {/* Order Card Header */}
                                    <div style={{
                                        padding: '1rem 1.25rem',
                                        background: 'var(--surface-soft)',
                                        borderBottom: '1px solid var(--hairline)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.25rem',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>
                                                {order.id_ban ? `Bàn ${order.id_ban}` : 'Mang về'}
                                            </span>
                                            <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                                                #{order.id_donHang}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                                            Đặt lúc: {new Date(order.thoiGianTao).toLocaleString('vi-VN')}
                                        </div>
                                        {order.thoiGianHoanThanh && (
                                            <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.15rem' }}>
                                                <span>Hoàn thành:</span>
                                                <span>{new Date(order.thoiGianHoanThanh).toLocaleString('vi-VN')}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Food Items List */}
                                    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                                        {order.chi_tiet.map((item) => (
                                            <div
                                                key={item.id_chiTietDonHang}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    padding: '0.6rem',
                                                    borderRadius: 'var(--rounded-md)',
                                                    background: item.isMyItem ? 'rgba(16,185,129,0.05)' : 'var(--surface-soft)',
                                                    border: item.isMyItem ? '1px solid rgba(16,185,129,0.2)' : '1px solid var(--hairline)',
                                                }}
                                            >
                                                <div style={{
                                                    width: '40px', height: '40px', borderRadius: '0.4rem',
                                                    overflow: 'hidden', flexShrink: 0,
                                                    background: 'var(--hairline)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    {item.hinhAnh ? (
                                                        <img
                                                            src={`${BASE_URL}${item.hinhAnh}`}
                                                            alt={item.tenMon}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            onError={e => { e.target.style.display = 'none'; }}
                                                        />
                                                    ) : (
                                                        <span style={{ fontSize: '1rem' }}></span>
                                                    )}
                                                </div>

                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{
                                                        fontWeight: 'bold',
                                                        fontSize: '0.9rem',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}>
                                                        {item.tenMon}
                                                        <span style={{ marginLeft: '0.4rem', color: 'var(--muted)', fontWeight: 'normal' }}>
                                                            x{item.soLuong}
                                                        </span>
                                                    </div>

                                                    <div style={{ fontSize: '0.75rem', marginTop: '0.15rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>

                                                        {item.isMyItem ? (
                                                            <strong style={{ color: '#059669' }}>Bạn chế biến</strong>
                                                        ) : (
                                                            <span>{item.tenNhanVienBep || 'Bếp khác / Chưa lưu'}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div style={{
                                                    padding: '0.15rem 0.4rem',
                                                    background: 'rgba(16,185,129,0.1)',
                                                    color: '#059669',
                                                    borderRadius: '0.25rem',
                                                    fontSize: '0.7rem',
                                                    fontWeight: '600'
                                                }}>
                                                    ✓ Xong
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Footer */}
                                    <div style={{
                                        padding: '0.75rem 1.25rem',
                                        borderTop: '1px solid var(--hairline)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: 'var(--surface-soft)',
                                        fontSize: '0.8rem',
                                        color: 'var(--muted)',
                                    }}>
                                        <span style={{
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: '0.25rem',
                                            background: order.tinhTrang === 'Đã thanh toán' ? 'rgba(16,185,129,0.1)' : 'rgba(168,85,247,0.1)',
                                            color: order.tinhTrang === 'Đã thanh toán' ? '#059669' : '#a855f7',
                                            fontWeight: 'bold'
                                        }}>
                                            {order.tinhTrang}
                                        </span>
                                        <span>{order.chi_tiet.length} món</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}

                {/* Shifts tab */}
                {activeTab === 'shifts' && (
                    personalShiftsLoading ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
                            <div style={{ width: '48px', height: '48px', border: '4px solid var(--hairline)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                            Đang tải lịch sử ca làm...
                        </div>
                    ) : personalShifts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '5rem 2rem', borderRadius: 'var(--rounded-xl)', border: '2px dashed var(--hairline)', background: 'var(--surface-card)' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏰</div>
                            <h2 style={{ margin: '0 0 0.5rem' }}>Chưa có lịch sử ca làm</h2>
                            <p style={{ color: 'var(--muted)', margin: 0 }}>Lịch sử check-in và tan ca của bạn sẽ được hiển thị tại đây.</p>
                        </div>
                    ) : (
                        <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--rounded-xl)', border: '1px solid var(--hairline)', overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--hairline)', background: 'var(--surface-soft)' }}>
                                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: '700', color: 'var(--muted)' }}>Ngày</th>
                                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: '700', color: 'var(--muted)' }}>Ca làm</th>
                                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: '700', color: 'var(--muted)' }}>Giờ vào ca</th>
                                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: '700', color: 'var(--muted)' }}>Giờ tan ca</th>
                                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: '700', color: 'var(--muted)' }}>Thời lượng</th>
                                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: '700', color: 'var(--muted)' }}>Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {personalShifts.map(s => (
                                            <tr key={s.id} style={{ borderBottom: '1px solid var(--hairline)' }}>
                                                <td style={{ padding: '1.1rem 1.5rem', fontWeight: '600', color: 'var(--ink)' }}>{s.ngay}</td>
                                                <td style={{ padding: '1.1rem 1.5rem' }}>
                                                    <span style={{ padding: '0.25rem 0.65rem', borderRadius: '0.5rem', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(94,106,210,0.25)', color: '#fb923c', fontSize: '0.75rem', fontWeight: '700' }}>
                                                        {s.caLamViec}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1.1rem 1.5rem', color: 'var(--ink)', fontSize: '0.9rem', fontWeight: '600' }}>{s.thoiGianVao}</td>
                                                <td style={{ padding: '1.1rem 1.5rem', color: s.thoiGianRa === 'Chưa tan ca' ? 'rgba(255,255,255,0.3)' : '#fff', fontSize: '0.9rem', fontWeight: '600' }}>
                                                    {s.thoiGianRa}
                                                </td>
                                                <td style={{ padding: '1.1rem 1.5rem', color: '#fb923c', fontWeight: '700', fontSize: '0.9rem' }}>
                                                    {s.soGio !== null ? `${s.soGio} giờ` : '-'}
                                                </td>
                                                <td style={{ padding: '1.1rem 1.5rem' }}>
                                                    {s.thoiGianRa === 'Chưa tan ca' ? (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: 'var(--rounded-pill)', background: 'rgba(94,106,210,0.15)', border: '1px solid rgba(94,106,210,0.35)', color: '#fb923c', fontSize: '0.75rem', fontWeight: '700' }}>
                                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />
                                                            Đang làm
                                                        </span>
                                                    ) : (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: 'var(--rounded-pill)', background: 'var(--surface-soft)', border: '1px solid var(--hairline)', color: 'var(--muted)', fontSize: '0.75rem', fontWeight: '700' }}>
                                                            Đã hoàn thành
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                )}
            </div>

            {/* SHIFT VERIFICATION MODAL */}
            {showShiftModal && (
                <div onClick={() => setShowShiftModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-card)', borderRadius: 'var(--rounded-lg)', border: '1px solid var(--hairline)', width: '100%', maxWidth: '440px', boxShadow: '0 25px 60px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-soft)' }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>Xác Nhận Vào Ca Làm</h2>
                            <button onClick={() => setShowShiftModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.2rem' }}>✕</button>
                        </div>
                        <div style={{ padding: '1.5rem' }}>
                            {!shiftData?.caLamViec ? (
                                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>⚠️</div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 0.5rem', color: '#dc2626' }}>Chưa được gán ca làm việc!</h3>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)', lineHeight: '1.5' }}>
                                        Bạn chưa được Quản lý phân chia ca làm việc trong hệ thống.<br />
                                        Vui lòng liên hệ Quản lý để được xếp lịch ca làm việc trước khi thực hiện nhận ca.
                                    </p>
                                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                                        <button type="button" className="btn btn-outline" onClick={() => setShowShiftModal(false)} style={{ padding: '0.5rem 1.5rem' }}>Đóng</button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', color: 'var(--ink)', lineHeight: '1.5' }}>
                                        Hệ thống sẽ thực hiện kiểm tra và check-in vào ca làm việc được gán bởi Quản lý cho tài khoản của bạn:
                                    </p>

                                    <div style={{
                                        padding: '1.25rem',
                                        borderRadius: 'var(--rounded-md)',
                                        border: '1px solid var(--hairline)',
                                        background: 'var(--surface-soft)',
                                        marginBottom: '1.5rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.75rem'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Đầu bếp:</span>
                                            <span style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{user.hoTen}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Ca làm được gán:</span>
                                            <span style={{
                                                fontSize: '0.9rem',
                                                fontWeight: 'bold',
                                                color: '#2563eb',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.35rem'
                                            }}>
                                                {shiftData.caLamViec === 'Ca sáng' ? ' Ca sáng' : shiftData.caLamViec === 'Ca chiều' ? ' Ca chiều' : ' Ca tối'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Khung giờ ca:</span>
                                            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                                                {shiftData.caLamViec === 'Ca sáng' ? '07:00 - 12:00' : shiftData.caLamViec === 'Ca chiều' ? '12:00 - 17:00' : '17:00 - 22:00'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--hairline)', paddingTop: '0.75rem' }}>
                                            <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Giờ hiện tại:</span>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#10b981' }}>{formatTime(new Date())}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                        <button type="button" className="btn btn-outline" onClick={() => setShowShiftModal(false)} style={{ padding: '0.5rem 1.25rem' }}>Hủy</button>
                                        <button
                                            type="button"
                                            onClick={handleShiftCheckIn}
                                            disabled={shiftLoading}
                                            className="btn btn-primary"
                                            style={{ padding: '0.5rem 1.5rem', background: '#2563eb', borderColor: '#2563eb', fontWeight: 'bold' }}
                                        >
                                            {shiftLoading ? 'Đang xác thực...' : 'Xác Nhận Vào Ca'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* CUSTOM PREMIUM CHECKOUT MODAL */}
            {showCheckoutModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(15,23,42,0.6)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem'
                }}>
                    <div style={{
                        background: 'var(--surface-card)',
                        border: '1px solid var(--hairline)',
                        borderRadius: 'var(--rounded-xl)',
                        width: '100%',
                        maxWidth: '480px',
                        padding: '2rem',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.25rem',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '50%',
                                background: isEarlyCheckout ? 'rgba(239,68,68,0.1)' : 'rgba(249,115,22,0.1)',
                                color: isEarlyCheckout ? '#ef4444' : 'var(--primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.25rem'
                            }}>
                                🚪
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--ink)' }}>
                                    {isEarlyCheckout ? 'Tan Ca Làm Sớm' : 'Xác Nhận Tan Ca'}
                                </h3>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                                    {isEarlyCheckout ? 'Bạn đang muốn rời ca khi chưa kết thúc thời gian làm việc' : 'Xác nhận kết thúc ca làm việc của bạn'}
                                </p>
                            </div>
                        </div>

                        {isEarlyCheckout ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{
                                    padding: '0.85rem 1rem',
                                    background: 'rgba(239,68,68,0.05)',
                                    border: '1px solid rgba(239,68,68,0.15)',
                                    borderRadius: 'var(--rounded-md)',
                                    fontSize: '0.85rem',
                                    color: '#b91c1c',
                                    lineHeight: '1.4'
                                }}>
                                    ⚠️ <strong>Lưu ý:</strong> Ca làm việc của bạn là <strong>{shiftData?.caLamViec}</strong> (kết thúc lúc {shiftData?.caLamViec === 'Ca chiều' ? '17' : shiftData?.caLamViec === 'Ca tối' ? '22' : '12'}:00). Bạn đang tan ca sớm!
                                </div>

                                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--ink)' }}>
                                    Lý do tan ca sớm của bạn: <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <textarea
                                    value={checkoutReason}
                                    onChange={(e) => {
                                        setCheckoutReason(e.target.value);
                                        if (e.target.value.trim()) setEarlyCheckoutError('');
                                    }}
                                    placeholder="Vui lòng nhập rõ lý do tan ca sớm (ví dụ: có việc đột xuất gia đình, đã được sự đồng ý của quản lý...)"
                                    style={{
                                        width: '100%',
                                        height: '100px',
                                        padding: '0.75rem',
                                        borderRadius: 'var(--rounded-md)',
                                        border: earlyCheckoutError ? '1px solid #ef4444' : '1px solid var(--hairline)',
                                        background: 'var(--surface-soft)',
                                        color: 'var(--ink)',
                                        fontSize: '0.9rem',
                                        outline: 'none',
                                        resize: 'none',
                                        fontFamily: 'inherit',
                                        transition: 'border-color 0.2s'
                                    }}
                                />
                                {earlyCheckoutError && (
                                    <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 'bold' }}>
                                        {earlyCheckoutError}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <div style={{ fontSize: '0.92rem', color: 'var(--muted)', lineHeight: '1.5' }}>
                                Bạn có chắc chắn muốn tan ca làm việc hiện tại không? Hệ thống sẽ ghi nhận thời điểm bạn tan ca và cập nhật trạng thái hoạt động của bạn thành <strong>Nghỉ</strong>.
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <button
                                onClick={() => setShowCheckoutModal(false)}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    borderRadius: 'var(--rounded-md)',
                                    border: '1px solid var(--hairline)',
                                    background: 'transparent',
                                    color: 'var(--muted)',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                }}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={submitShiftCheckOut}
                                disabled={shiftLoading}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    borderRadius: 'var(--rounded-md)',
                                    border: 'none',
                                    background: isEarlyCheckout ? '#ef4444' : 'var(--primary)',
                                    color: 'var(--ink)',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem',
                                    cursor: shiftLoading ? 'not-allowed' : 'pointer',
                                    boxShadow: isEarlyCheckout ? '0 4px 12px rgba(239,68,68,0.2)' : '0 4px 12px rgba(94,106,210,0.2)',
                                    transition: 'opacity 0.2s'
                                }}
                            >
                                {shiftLoading ? 'Đang xử lý...' : 'Xác Nhận'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KitchenPage;
