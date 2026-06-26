import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Sub-components
import { 
    BASE_URL, ITEM_STATUS_FLOW, formatTime, getElapsedMinutes,
    getItemStatusStyle, getOrderStatusStyle 
} from './components/KitchenConstants';
import KitchenShiftModal from './components/KitchenShiftModal';
import KitchenCheckoutModal from './components/KitchenCheckoutModal';
import UpcomingView from './components/KitchenTabs/UpcomingView';
import HistoryView from './components/KitchenTabs/HistoryView';
import ShiftsView from './components/KitchenTabs/ShiftsView';

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

    const [upcomingOrders, setUpcomingOrders] = useState([]);
    const [upcomingLoading, setUpcomingLoading] = useState(false);

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

    const fetchUpcoming = useCallback(async () => {
        setUpcomingLoading(true);
        try {
            const res = await axios.get(`${BASE_URL}/api/donhang/kitchen/upcoming`);
            setUpcomingOrders(res.data);
        } catch (err) {
            console.error('Lỗi tải đơn sắp tới:', err);
        } finally {
            setUpcomingLoading(false);
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
        if (!autoRefresh) return;
        if (activeTab !== 'active' && activeTab !== 'upcoming') return;
        const fn = activeTab === 'active' ? fetchOrders : fetchUpcoming;
        const interval = setInterval(fn, 20000);
        return () => clearInterval(interval);
    }, [autoRefresh, activeTab, fetchOrders, fetchUpcoming]);

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
            else if (shiftData.caLamViec === 'Ca tối') endHour = 24;

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
                        <button onClick={() => setAutoRefresh(v => !v)} style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--rounded-pill)', border: `1px solid ${autoRefresh ? 'rgba(52,211,153,0.4)' : 'var(--hairline)'}`, background: autoRefresh ? 'rgba(52,211,153,0.1)' : 'var(--surface-soft)', color: autoRefresh ? '#34d399' : 'var(--muted)', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
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
                        onClick={() => { setActiveTab('upcoming'); fetchUpcoming(); }}
                        style={{
                            padding: '0.55rem 1.4rem',
                            borderRadius: 'var(--rounded-pill)',
                            border: activeTab === 'upcoming' ? 'none' : '1px solid var(--hairline)',
                            background: activeTab === 'upcoming' ? 'var(--primary)' : 'var(--surface-card)',
                            color: activeTab === 'upcoming' ? '#fff' : 'var(--muted)',
                            fontWeight: '700',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: activeTab === 'upcoming' ? '0 4px 14px rgba(94,106,210,0.3)' : 'none',
                        }}
                    >
                        Đơn sắp tới ({upcomingOrders.length})
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

                {/* Upcoming tab */}
                {activeTab === 'upcoming' && (
                    <UpcomingView 
                        upcomingOrders={upcomingOrders} 
                        upcomingLoading={upcomingLoading} 
                    />
                )}

                {/* History tab */}
                {activeTab === 'history' && (
                    <HistoryView 
                        historyOrders={historyOrders} 
                        historyLoading={historyLoading} 
                    />
                )}

                {/* Shifts tab */}
                {activeTab === 'shifts' && (
                    <ShiftsView 
                        personalShifts={personalShifts} 
                        personalShiftsLoading={personalShiftsLoading} 
                    />
                )}
            </div>

            <KitchenShiftModal
                showShiftModal={showShiftModal}
                setShowShiftModal={setShowShiftModal}
                shiftData={shiftData}
                user={user}
                handleShiftCheckIn={handleShiftCheckIn}
                shiftLoading={shiftLoading}
            />

            <KitchenCheckoutModal
                showCheckoutModal={showCheckoutModal}
                setShowCheckoutModal={setShowCheckoutModal}
                isEarlyCheckout={isEarlyCheckout}
                shiftData={shiftData}
                checkoutReason={checkoutReason}
                setCheckoutReason={setCheckoutReason}
                earlyCheckoutError={earlyCheckoutError}
                setEarlyCheckoutError={setEarlyCheckoutError}
                submitShiftCheckOut={submitShiftCheckOut}
                shiftLoading={shiftLoading}
            />
        </div>
    );
};

export default KitchenPage;
