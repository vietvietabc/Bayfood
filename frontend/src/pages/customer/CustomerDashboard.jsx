import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    CalendarDays, ClipboardList, Clock3, LogIn, MapPin, UtensilsCrossed,
    UserCircle2, MapPinned, CheckCheck, Eye, Star, Edit3, KeyRound,
    ShieldCheck, Eye as EyeIcon, EyeOff, ChevronRight, LayoutDashboard,
    History, Settings, CreditCard
} from 'lucide-react';
import useCustomerDashboard from './useCustomerDashboard';
import { formatDateTime, getStatusStyle } from './customerDashboardUtils';
import OrderModal from './OrderModal';
import ReservationModal from './ReservationModal';
import ReviewModal from './ReviewModal';
import QrPaymentModal from './QrPaymentModal';
import './CustomerDashboard.css';

const TABS = [
    { key: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { key: 'reservations', label: 'Đặt bàn', icon: CalendarDays },
    { key: 'orders', label: 'Đơn món', icon: ClipboardList },
    { key: 'account', label: 'Tài khoản', icon: Settings },
];

/* ══════════════════════════════════════════════════════════════
   CustomerDashboard — Premium Account Page
   ══════════════════════════════════════════════════════════════ */
const CustomerDashboard = () => {
    const ctx = useCustomerDashboard();
    const {
        user, authLoading, loading, error,
        reservations, orders, reviews,
        activeReservations, activeOrders,
        checkinLoadingId, actionMessage, checkinToast,
        handleCheckin, handleCheckinOrder,
        selectedOrder, orderDetailLoading, showOrderModal,
        handleViewOrder, handleCloseOrderModal, handleEditOrder,
        selectedReservation, showReservationModal,
        handleViewReservation, handleCloseReservationModal,
        showReviewModal, setShowReviewModal, reviewForm, setReviewForm, isSubmittingReview,
        handleSubmittingReview,
        qrModal, setQrModal, copiedField, handleCopyText, handleVNPayPayment,
        setShowOrderModal, setSelectedReservation, setShowReservationModal,
    } = ctx;

    // ── Password Change ───────────────────────────────────────
    const [pwForm, setPwForm] = useState({ matKhauCu: '', matKhauMoi: '', xacNhanMatKhau: '' });
    const [pwLoading, setPwLoading] = useState(false);
    const [pwMsg, setPwMsg] = useState(null);
    const [showPw, setShowPw] = useState({ cu: false, moi: false, xacNhan: false });

    // ── Tab & Profile ─────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('overview');
    const [profileForm, setProfileForm] = useState({ hoTen: '', soDienThoai: '' });
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileMsg, setProfileMsg] = useState(null);

    React.useEffect(() => {
        if (user) {
            setProfileForm({ hoTen: user.hoTen || '', soDienThoai: user.soDienThoai || '' });
        }
    }, [user]);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setProfileMsg(null);
        setProfileLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/users/me/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(profileForm),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Cập nhật thất bại');
            setProfileMsg({ type: 'success', text: 'Cập nhật thành công! Vui lòng tải lại trang.' });
        } catch (err) {
            setProfileMsg({ type: 'error', text: err.message });
        } finally {
            setProfileLoading(false);
        }
    };

    const handleChangePw = async (e) => {
        e.preventDefault();
        setPwMsg(null);
        if (pwForm.matKhauMoi !== pwForm.xacNhanMatKhau) {
            setPwMsg({ type: 'error', text: 'Mật khẩu mới và xác nhận không khớp.' });
            return;
        }
        if (pwForm.matKhauMoi.length < 6) {
            setPwMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
            return;
        }
        setPwLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/users/me/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ matKhauCu: pwForm.matKhauCu, matKhauMoi: pwForm.matKhauMoi }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Đổi mật khẩu thất bại');
            setPwMsg({ type: 'success', text: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại nếu cần.' });
            setPwForm({ matKhauCu: '', matKhauMoi: '', xacNhanMatKhau: '' });
        } catch (err) {
            setPwMsg({ type: 'error', text: err.message });
        } finally {
            setPwLoading(false);
        }
    };

    /* ── Loading State ──────────────────────────────────────── */
    if (authLoading || (loading && user)) {
        return (
            <div className="cd-loading-wrap">
                <div className="cd-spinner" />
                <p className="cd-loading-text">Đang tải khu vực khách hàng...</p>
            </div>
        );
    }

    /* ── Not Logged In ──────────────────────────────────────── */
    if (!user) {
        return (
            <div className="cd-root">
                <div className="cd-guest-card">
                    <div className="cd-guest-icon">
                        <UserCircle2 size={36} />
                    </div>
                    <h1 className="cd-guest-title">Khu vực khách hàng</h1>
                    <p className="cd-guest-desc">
                        Đăng nhập để xem đơn hàng, đặt bàn và thông tin tài khoản của bạn.
                    </p>
                    <div className="cd-guest-actions">
                        <Link to="/login" className="cd-btn cd-btn--primary">
                            <LogIn size={18} /> Đăng nhập
                        </Link>
                        <Link to="/register" className="cd-btn cd-btn--outline">Đăng ký tài khoản</Link>
                        <Link to="/menu" className="cd-btn cd-btn--outline">Xem thực đơn</Link>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Main Dashboard ─────────────────────────────────────── */
    return (
        <div className="cd-root">
            {/* Toast */}
            {checkinToast && <div className="cd-toast">{checkinToast}</div>}

            {/* Banners */}
            {error && <div className="cd-banner cd-banner--error">{error}</div>}
            {actionMessage && <div className="cd-banner cd-banner--action">{actionMessage}</div>}

            {/* Hero */}
            {/* <div className="cd-hero">
                <div className="cd-hero-inner">
                    <div>
                        <div className="cd-hero-badge">
                            <UserCircle2 size={14} /> Khu vực khách hàng
                        </div>
                        <h1 className="cd-hero-title">Xin chào, {user.hoTen}</h1>
                        <p className="cd-hero-subtitle">
                            Quản lý đặt bàn, đơn món và tài khoản của bạn tại một nơi.
                        </p>
                    </div>
                    <div className="cd-hero-actions">
                        <Link to="/menu" className="cd-btn cd-btn--primary">
                            <UtensilsCrossed size={18} /> Đặt món
                        </Link>
                        <Link to="/reservation" className="cd-btn cd-btn--outline">
                            <CalendarDays size={18} /> Đặt bàn
                        </Link>
                    </div>
                </div>
            </div> */}

            {/* Layout: Sidebar + Content */}
            <div className="cd-layout">
                {/* Sidebar Navigation */}
                <nav className="cd-sidebar">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        const count = tab.key === 'orders' ? activeOrders
                            : tab.key === 'reservations' ? activeReservations
                                : null;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`cd-sidebar-btn ${isActive ? 'cd-sidebar-btn--active' : ''}`}
                            >
                                <span className="cd-sidebar-icon">
                                    <Icon size={18} />
                                </span>
                                <span>{tab.label}</span>
                                {count > 0 && <span className="cd-sidebar-count">{count}</span>}
                            </button>
                        );
                    })}
                </nav>

                {/* Content Area */}
                <div className="cd-content" key={activeTab}>
                    {/* ═══ OVERVIEW ═══ */}
                    {activeTab === 'overview' && <OverviewTab user={user} orders={orders} reservations={reservations} activeOrders={activeOrders} activeReservations={activeReservations} />}

                    {/* ═══ RESERVATIONS ═══ */}
                    {activeTab === 'reservations' && (
                        <ReservationsTab
                            reservations={reservations}
                            orders={orders}
                            checkinLoadingId={checkinLoadingId}
                            handleCheckin={handleCheckin}
                            handleViewReservation={handleViewReservation}
                            handleVNPayPayment={handleVNPayPayment}
                            setQrModal={setQrModal}
                        />
                    )}

                    {/* ═══ ORDERS ═══ */}
                    {activeTab === 'orders' && (
                        <OrdersTab
                            orders={orders}
                            reservations={reservations}
                            checkinLoadingId={checkinLoadingId}
                            handleViewOrder={handleViewOrder}
                            handleEditOrder={handleEditOrder}
                            handleCheckinOrder={handleCheckinOrder}
                            setShowReviewModal={setShowReviewModal}
                            setReviewForm={setReviewForm}
                        />
                    )}

                    {/* ═══ ACCOUNT ═══ */}
                    {activeTab === 'account' && (
                        <AccountTab
                            profileForm={profileForm}
                            setProfileForm={setProfileForm}
                            profileLoading={profileLoading}
                            profileMsg={profileMsg}
                            handleUpdateProfile={handleUpdateProfile}
                            pwForm={pwForm}
                            setPwForm={setPwForm}
                            pwLoading={pwLoading}
                            pwMsg={pwMsg}
                            showPw={showPw}
                            setShowPw={setShowPw}
                            handleChangePw={handleChangePw}
                        />
                    )}
                </div>
            </div>

            {/* Modals */}
            <OrderModal
                showOrderModal={showOrderModal}
                orderDetailLoading={orderDetailLoading}
                selectedOrder={selectedOrder}
                reservations={reservations}
                handleCloseOrderModal={handleCloseOrderModal}
                setShowOrderModal={setShowOrderModal}
                setSelectedReservation={setSelectedReservation}
                setShowReservationModal={setShowReservationModal}
                reviews={reviews}
                showReviewModal={showReviewModal}
                setShowReviewModal={setShowReviewModal}
                reviewForm={reviewForm}
                setReviewForm={setReviewForm}
            />
            <ReservationModal
                showReservationModal={showReservationModal}
                selectedReservation={selectedReservation}
                orders={orders}
                handleCloseReservationModal={handleCloseReservationModal}
                setShowReservationModal={setShowReservationModal}
                handleViewOrder={handleViewOrder}
            />
            <ReviewModal
                showReviewModal={showReviewModal}
                setShowReviewModal={setShowReviewModal}
                reviewForm={reviewForm}
                setReviewForm={setReviewForm}
                isSubmittingReview={isSubmittingReview}
                handleSubmittingReview={handleSubmittingReview}
                orders={orders}
                reviews={reviews}
            />
            <QrPaymentModal
                qrModal={qrModal}
                setQrModal={setQrModal}
                copiedField={copiedField}
                handleCopyText={handleCopyText}
            />
        </div>
    );
};


/* ══════════════════════════════════════════════════════════════
   Sub-Components (Tab Panels)
   ══════════════════════════════════════════════════════════════ */

/* ── Overview ──────────────────────────────────────────────── */
const OverviewTab = ({ user, orders, reservations, activeOrders, activeReservations }) => (
    <div className="cd-stats-grid">
        <div className="cd-stat-card">
            <div className="cd-stat-header">
                <div className="cd-stat-icon cd-stat-icon--orders"><ClipboardList size={20} /></div>
                <span className="cd-stat-label">Đơn món</span>
            </div>
            <div className="cd-stat-value">{orders.length}</div>
            <div className="cd-stat-sub">{activeOrders} đơn đang xử lý</div>
        </div>
        <div className="cd-stat-card">
            <div className="cd-stat-header">
                <div className="cd-stat-icon cd-stat-icon--reservations"><MapPin size={20} /></div>
                <span className="cd-stat-label">Đặt bàn</span>
            </div>
            <div className="cd-stat-value">{reservations.length}</div>
            <div className="cd-stat-sub">{activeReservations} đang chờ hoặc xác nhận</div>
        </div>
        <div className="cd-stat-card">
            <div className="cd-stat-header">
                <div className="cd-stat-icon cd-stat-icon--account"><UserCircle2 size={20} /></div>
                <span className="cd-stat-label">Tài khoản</span>
            </div>
            <div className="cd-stat-value" style={{ fontSize: '1.15rem' }}>{user.tenVaiTro || 'Khách hàng'}</div>
            <div className="cd-stat-sub">{user.soDienThoai || 'Chưa cập nhật SĐT'}</div>
        </div>
    </div>
);


/* ── Reservations ──────────────────────────────────────────── */
const ReservationsTab = ({ reservations, orders, checkinLoadingId, handleCheckin, handleViewReservation, handleVNPayPayment, setQrModal }) => {
    const [filter, setFilter] = React.useState('Tất cả');
    const STATUSES = ['Tất cả', 'Chờ xác nhận', 'Đã đặt', 'Đã xác nhận', 'Đã checkin', 'Hoàn thành', 'Đã hủy', 'Vắng mặt'];
    
    const filtered = React.useMemo(() => {
        if (filter === 'Tất cả') return reservations;
        return reservations.filter(r => r.trangThai === filter);
    }, [reservations, filter]);

    return (
    <>
        <div className="cd-section-header" style={{ marginBottom: '1rem' }}>
            <div>
                <h2 className="cd-section-title">Lịch sử đặt bàn</h2>
                <p className="cd-section-desc">Tất cả các lượt đặt bàn của bạn.</p>
            </div>
            <Link to="/reservation" className="cd-section-link">
                <CalendarDays size={15} /> Đặt thêm <ChevronRight size={14} />
            </Link>
        </div>

        {/* Filter Bar */}
        {reservations.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', background: 'var(--surface-light)', padding: '0.75rem 1rem', borderRadius: '0.85rem', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', marginRight: '0.5rem' }}>Lọc trạng thái:</span>
                {STATUSES.map(s => {
                    const isActive = filter === s;
                    const style = s !== 'Tất cả' ? getStatusStyle(s) : { bg: 'rgba(249,115,22,0.1)', color: '#f97316' };
                    return (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            style={{
                                padding: '0.35rem 0.85rem',
                                borderRadius: '999px',
                                border: isActive ? `1px solid ${style.color}55` : '1px solid var(--border)',
                                background: isActive ? style.bg : 'transparent',
                                color: isActive ? style.color : 'var(--text-muted)',
                                fontSize: '0.78rem',
                                fontWeight: isActive ? 700 : 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {s}
                        </button>
                    );
                })}
            </div>
        )}

        {filtered.length === 0 ? (
            <div className="cd-empty">
                <div className="cd-empty-icon"><CalendarDays size={28} /></div>
                {filter === 'Tất cả' ? 'Bạn chưa có lịch sử đặt bàn nào.' : `Không có bàn nào ở trạng thái "${filter}".`}
            </div>
        ) : (
            <div className="cd-list">
                {filtered.map((res, idx) => {
                    const statusStyle = getStatusStyle(res.trangThai);
                    return (
                        <div key={res.id_datBan} className="cd-item" style={{ animationDelay: `${idx * 0.04}s` }}>
                            <div className="cd-item-head">
                                <span className="cd-item-id">
                                    <span className="cd-item-id-hash">#</span>{res.id_datBan}
                                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.85rem' }}>
                                        — Bàn {res.id_ban || 'Chưa chọn'}
                                    </span>
                                </span>
                                <span className="cd-status-badge" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                                    {res.trangThai}
                                </span>
                            </div>

                            <div className="cd-item-body">
                                <span className="cd-item-row"><Clock3 size={14} /> Thời gian: {formatDateTime(res.thoiGianDen)}</span>
                                <span className="cd-item-row"><MapPinned size={14} /> Đến thực tế: {formatDateTime(res.thoiGianDenThucTe)}</span>
                                <span className="cd-item-row"><UserCircle2 size={14} /> Số người: {res.soNguoi}</span>
                                {res.ghiChu && <span className="cd-item-row">📝 Ghi chú: {res.ghiChu}</span>}

                                {res.tienCoc > 0 && (
                                    <span className="cd-deposit-info">
                                        <CreditCard size={14} style={{ opacity: 0.5 }} />
                                        Tiền cọc:&nbsp;
                                        <strong style={{ color: res.trangThaiCoc === 'Mất cọc' ? '#f87171' : res.trangThaiCoc === 'Đã cọc' ? '#34d399' : '#fbbf24' }}>
                                            {Number(res.tienCoc).toLocaleString('vi-VN')} ₫
                                        </strong>
                                        <span className="cd-deposit-badge" style={{
                                            background: res.trangThaiCoc === 'Mất cọc' ? 'rgba(248,113,113,0.12)' : res.trangThaiCoc === 'Đã cọc' ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.12)',
                                            color: res.trangThaiCoc === 'Mất cọc' ? '#f87171' : res.trangThaiCoc === 'Đã cọc' ? '#34d399' : '#fbbf24'
                                        }}>
                                            {res.trangThaiCoc}
                                        </span>
                                    </span>
                                )}

                                {res.lyDoHuy && <span style={{ color: '#f87171', fontSize: '0.85rem', fontStyle: 'italic' }}>Lý do: {res.lyDoHuy}</span>}
                                {orders.some(o => o.id_datBan === res.id_datBan) && (
                                    <span className="cd-item-linked">Đã đặt món đi kèm</span>
                                )}
                                {res.soPhutGiuChoConLai != null && res.soPhutGiuChoConLai > 0 && (
                                    <span className="cd-item-hold-time">
                                        <Clock3 size={14} /> Giữ chỗ còn lại: {res.soPhutGiuChoConLai} phút
                                    </span>
                                )}
                            </div>

                            <div className="cd-item-footer">
                                {res.tienCoc > 0 && res.trangThaiCoc !== 'Đã cọc' && res.trangThaiCoc !== 'Mất cọc' && res.trangThai !== 'Đã hủy' && res.trangThai !== 'Vắng mặt' && (
                                    <>
                                        <button className="cd-btn cd-btn--vnpay" onClick={() => handleVNPayPayment('datban', res.id_datBan, res.tienCoc)}>
                                            VNPay ({Number(res.tienCoc).toLocaleString('vi-VN')} ₫)
                                        </button>
                                        <button className="cd-btn cd-btn--vietqr" onClick={() => setQrModal({ amount: res.tienCoc, addInfo: `DAT BAN DB${res.id_datBan}`, label: `Thanh toán cọc đặt bàn #${res.id_datBan}` })}>
                                            VietQR ({Number(res.tienCoc).toLocaleString('vi-VN')} ₫)
                                        </button>
                                    </>
                                )}
                                <button className="cd-btn cd-btn--outline" onClick={() => handleViewReservation(res)}>
                                    <Eye size={15} /> Chi tiết
                                </button>
                                {res.trangThai === 'Đã xác nhận' && (
                                    <button className="cd-btn cd-btn--checkin" onClick={() => handleCheckin(res.id_datBan)} disabled={checkinLoadingId === res.id_datBan}>
                                        <MapPinned size={15} /> {checkinLoadingId === res.id_datBan ? 'Đang check-in...' : 'Tôi đã tới bàn'}
                                    </button>
                                )}
                            </div>

                            {res.trangThai === 'Chờ xác nhận' && <div className="cd-item-note cd-item-note--pending">Bàn đang chờ admin xác nhận, chưa thể check-in.</div>}
                            {res.trangThai === 'Đã đặt' && <div className="cd-item-note cd-item-note--booked">Bàn đã được đặt, chờ admin xác nhận trước khi check-in.</div>}
                            {res.trangThai === 'Đã checkin' && <div className="cd-item-note cd-item-note--checkedin">Đã check-in, admin đã nhận thông báo.</div>}
                        </div>
                    );
                })}
            </div>
        )}
    </>
    );
};


/* ── Orders ────────────────────────────────────────────────── */
const OrdersTab = ({ orders, reservations, checkinLoadingId, handleViewOrder, handleEditOrder, handleCheckinOrder, setShowReviewModal, setReviewForm }) => {
    const [filter, setFilter] = React.useState('Tất cả');
    const STATUSES = ['Tất cả', 'Chờ xác nhận', 'Chờ khách đến', 'Đang xử lý', 'Đã thanh toán', 'Hoàn thành', 'Đã hủy', 'Vắng mặt'];
    
    const filtered = React.useMemo(() => {
        if (filter === 'Tất cả') return orders;
        return orders.filter(o => o.tinhTrang === filter);
    }, [orders, filter]);

    return (
    <>
        <div className="cd-section-header" style={{ marginBottom: '1rem' }}>
            <div>
                <h2 className="cd-section-title">Lịch sử đặt món</h2>
                <p className="cd-section-desc">Xem lại tất cả đơn món và trạng thái xử lý.</p>
            </div>
            <Link to="/cart" className="cd-section-link">
                <ClipboardList size={15} /> Giỏ hàng <ChevronRight size={14} />
            </Link>
        </div>

        {/* Filter Bar */}
        {orders.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', background: 'var(--surface-light)', padding: '0.75rem 1rem', borderRadius: '0.85rem', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', marginRight: '0.5rem' }}>Lọc trạng thái:</span>
                {STATUSES.map(s => {
                    const isActive = filter === s;
                    const style = s !== 'Tất cả' ? getStatusStyle(s) : { bg: 'rgba(249,115,22,0.1)', color: '#f97316' };
                    return (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            style={{
                                padding: '0.35rem 0.85rem',
                                borderRadius: '999px',
                                border: isActive ? `1px solid ${style.color}55` : '1px solid var(--border)',
                                background: isActive ? style.bg : 'transparent',
                                color: isActive ? style.color : 'var(--text-muted)',
                                fontSize: '0.78rem',
                                fontWeight: isActive ? 700 : 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {s}
                        </button>
                    );
                })}
            </div>
        )}

        {filtered.length === 0 ? (
            <div className="cd-empty">
                <div className="cd-empty-icon"><ClipboardList size={28} /></div>
                {filter === 'Tất cả' ? 'Bạn chưa có lịch sử đặt món nào.' : `Không có đơn món nào ở trạng thái "${filter}".`}
            </div>
        ) : (
            <div className="cd-list">
                {filtered.map((order, idx) => {
                    const statusStyle = getStatusStyle(order.tinhTrang);
                    const linkedRes = reservations.find(r => r.id_datBan === order.id_datBan);
                    const depositAmount = linkedRes && linkedRes.tienCoc > 0 ? Number(linkedRes.tienCoc || 0) : 0;
                    const hasPaidDeposit = linkedRes && linkedRes.trangThaiCoc === 'Đã cọc';
                    const totalActuallyPaid = Number(order.tongThanhToan || 0);
                    const effectivePaid = hasPaidDeposit ? Math.max(depositAmount, totalActuallyPaid) : totalActuallyPaid;
                    const tongTien = Number(order.tongTien || 0);
                    const remainingAmount = tongTien - effectivePaid;   // âm = trả thừa
                    const overpaidAmount = remainingAmount < 0 ? Math.abs(remainingAmount) : 0;
                    const extraPaid = hasPaidDeposit && totalActuallyPaid > depositAmount ? totalActuallyPaid - depositAmount : 0;

                    return (
                        <div key={order.id_donHang} className="cd-item" style={{ animationDelay: `${idx * 0.04}s` }}>
                            <div className="cd-item-head">
                                <span className="cd-item-id">
                                    <span className="cd-item-id-hash">#</span>{order.id_donHang}
                                </span>
                                <span className="cd-status-badge" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                                    {order.tinhTrang}
                                </span>
                            </div>

                            <div className="cd-item-body">
                                <span className="cd-item-row"><Clock3 size={14} /> Tạo: {formatDateTime(order.thoiGianTao)}</span>
                                <span className="cd-item-row"><MapPin size={14} /> Bàn: {order.id_ban ? `Bàn ${order.id_ban}` : order.id_datBan ? 'Đã đặt bàn (chờ xếp chỗ)' : 'Chưa đặt bàn'}</span>
                                {order.thoiGianDen && <span className="cd-item-row"><Clock3 size={14} /> Tới lúc: {formatDateTime(order.thoiGianDen)}</span>}
                                {order.id_datBan && <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.85rem' }}>Đã đặt kèm bàn #{order.id_datBan}</span>}

                                {/* Billing */}
                                <div className="cd-billing">
                                    <div className="cd-billing-row">
                                        <span>Tổng hóa đơn:</span>
                                        <strong>{Number(order.tongTien).toLocaleString('vi-VN')} ₫</strong>
                                    </div>
                                    {depositAmount > 0 && (
                                        <>
                                            <div className="cd-billing-row" style={{ color: hasPaidDeposit ? '#10b981' : '#ca8a04' }}>
                                                <span>Tiền cọc {hasPaidDeposit ? '(Đã TT)' : '(Chờ TT)'}:</span>
                                                <strong>-{depositAmount.toLocaleString('vi-VN')} ₫</strong>
                                            </div>
                                            {extraPaid > 0 && (
                                                <div className="cd-billing-row" style={{ color: '#10b981' }}>
                                                    <span>Đã TT bổ sung:</span>
                                                    <strong>-{extraPaid.toLocaleString('vi-VN')} ₫</strong>
                                                </div>
                                            )}
                                            {hasPaidDeposit && (
                                                <div className="cd-billing-row" style={{
                                                    color: remainingAmount > 0 ? '#f97316' : '#10b981',
                                                    fontWeight: 700
                                                }}>
                                                    <span>Còn lại:</span>
                                                    <strong>
                                                        {remainingAmount > 0
                                                            ? `${remainingAmount.toLocaleString('vi-VN')} ₫`
                                                            : overpaidAmount > 0
                                                                ? <span style={{ color: '#10b981' }}>Đã thanh toán đủ ✓</span>
                                                                : '0 ₫'
                                                        }
                                                    </strong>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="cd-item-footer">
                                <button className="cd-btn cd-btn--outline" onClick={() => handleViewOrder(order.id_donHang)}>
                                    <Eye size={15} /> Chi tiết
                                </button>
                                {order.tinhTrang === 'Chờ khách đến' && (
                                    <button className="cd-btn cd-btn--edit" onClick={() => handleEditOrder(order)}>
                                        <Edit3 size={15} /> Chỉnh sửa
                                    </button>
                                )}
                                {order.tinhTrang === 'Chờ khách đến' && !order.id_datBan && (
                                    <button className="cd-btn cd-btn--checkin" onClick={() => handleCheckinOrder(order.id_donHang)} disabled={checkinLoadingId === order.id_donHang}>
                                        <CheckCheck size={15} /> {checkinLoadingId === order.id_donHang ? 'Đang xử lý...' : 'Báo đã tới'}
                                    </button>
                                )}
                                {order.tinhTrang === 'Đã thanh toán' && (
                                    <button className="cd-btn cd-btn--review" onClick={() => { setReviewForm({ id_donHang: order.id_donHang, soSao: 5, noiDung: '', id_monAn: null }); setShowReviewModal(true); }}>
                                        <Star size={15} /> Đánh giá
                                    </button>
                                )}
                            </div>

                            {/* Refund notice — when customer overpaid */}
                            {overpaidAmount > 0 && (
                                <div style={{
                                    margin: '0.75rem 0 0',
                                    padding: '0.875rem 1rem',
                                    borderRadius: '0.75rem',
                                    background: 'rgba(16,185,129,0.08)',
                                    border: '1px solid rgba(16,185,129,0.25)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.3rem',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.87rem', color: '#10b981' }}>
                                        <span>💰</span>
                                        Bạn có <span style={{ fontSize: '1rem', letterSpacing: '-0.02em' }}>{overpaidAmount.toLocaleString('vi-VN')} ₫</span> tiền thừa chưa nhận
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                        Sau khi dùng xong bữa, vui lòng <strong style={{ color: 'var(--text)' }}>liên hệ nhân viên phục vụ</strong> để nhận lại số tiền thừa này.
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
                                        📞 Hotline hỗ trợ: 0904957943
                                    </div>
                                </div>
                            )}

                            {/* Absence warning */}
                            {order.tinhTrang === 'Vắng mặt' && depositAmount > 0 && (
                                <div className="cd-absence-banner">
                                    <div className="cd-absence-title">
                                        <span>⚠️</span> Bạn vắng mặt nhưng có tiền cọc liên quan
                                    </div>
                                    <div className="cd-absence-desc">
                                        Vui lòng liên hệ trực tiếp nhân viên nhà hàng để được hỗ trợ và thương lượng hoàn cọc.
                                    </div>
                                    <div className="cd-absence-phone">
                                        <span>📞</span> Hotline: 0904957943
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )}
    </>
    );
};


/* ── Account Settings ──────────────────────────────────────── */
const AccountTab = ({ profileForm, setProfileForm, profileLoading, profileMsg, handleUpdateProfile, pwForm, setPwForm, pwLoading, pwMsg, showPw, setShowPw, handleChangePw }) => (
    <div className="cd-account-grid">
        {/* Profile Form */}
        <section className="cd-form-card">
            <div className="cd-form-header">
                <div className="cd-form-icon cd-form-icon--profile">
                    <UserCircle2 size={22} />
                </div>
                <div>
                    <h2 className="cd-form-title">Thông tin cá nhân</h2>
                    <p className="cd-form-subtitle">Cập nhật thông tin liên lạc của bạn.</p>
                </div>
            </div>

            {profileMsg && (
                <div className={`cd-form-msg cd-form-msg--${profileMsg.type}`}>
                    {profileMsg.type === 'success' ? <ShieldCheck size={16} /> : <span>⚠</span>}
                    {profileMsg.text}
                </div>
            )}

            <form onSubmit={handleUpdateProfile} className="cd-form">
                <div>
                    <label className="cd-field-label">Họ và tên</label>
                    <input
                        type="text"
                        placeholder="Họ và tên"
                        value={profileForm.hoTen}
                        onChange={e => setProfileForm(f => ({ ...f, hoTen: e.target.value }))}
                        required
                        className="cd-field-input"
                    />
                </div>
                <div>
                    <label className="cd-field-label">Số điện thoại</label>
                    <input
                        type="tel"
                        placeholder="Số điện thoại"
                        value={profileForm.soDienThoai}
                        onChange={e => setProfileForm(f => ({ ...f, soDienThoai: e.target.value }))}
                        required
                        className="cd-field-input"
                    />
                </div>
                <button type="submit" disabled={profileLoading} className="cd-btn cd-btn--primary cd-btn--submit">
                    <CheckCheck size={16} />
                    {profileLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
            </form>
        </section>

        {/* Password Form */}
        <section className="cd-form-card">
            <div className="cd-form-header">
                <div className="cd-form-icon cd-form-icon--password">
                    <KeyRound size={22} />
                </div>
                <div>
                    <h2 className="cd-form-title">Đổi mật khẩu</h2>
                    <p className="cd-form-subtitle">Cập nhật mật khẩu để bảo mật tài khoản.</p>
                </div>
            </div>

            {pwMsg && (
                <div className={`cd-form-msg cd-form-msg--${pwMsg.type}`}>
                    {pwMsg.type === 'success' ? <ShieldCheck size={16} /> : <span>⚠</span>}
                    {pwMsg.text}
                </div>
            )}

            <form onSubmit={handleChangePw} className="cd-form">
                {/* Current Password */}
                <div>
                    <label className="cd-field-label">Mật khẩu hiện tại</label>
                    <div className="cd-pw-wrapper">
                        <input
                            type={showPw.cu ? 'text' : 'password'}
                            placeholder="Nhập mật khẩu hiện tại"
                            value={pwForm.matKhauCu}
                            onChange={e => setPwForm(f => ({ ...f, matKhauCu: e.target.value }))}
                            required
                            className="cd-field-input"
                            style={{ paddingRight: '2.75rem' }}
                        />
                        <button type="button" onClick={() => setShowPw(s => ({ ...s, cu: !s.cu }))} className="cd-pw-toggle">
                            {showPw.cu ? <EyeOff size={16} /> : <EyeIcon size={16} />}
                        </button>
                    </div>
                </div>

                {/* New Password */}
                <div>
                    <label className="cd-field-label">Mật khẩu mới</label>
                    <div className="cd-pw-wrapper">
                        <input
                            type={showPw.moi ? 'text' : 'password'}
                            placeholder="Ít nhất 6 ký tự"
                            value={pwForm.matKhauMoi}
                            onChange={e => setPwForm(f => ({ ...f, matKhauMoi: e.target.value }))}
                            required
                            className="cd-field-input"
                            style={{ paddingRight: '2.75rem' }}
                        />
                        <button type="button" onClick={() => setShowPw(s => ({ ...s, moi: !s.moi }))} className="cd-pw-toggle">
                            {showPw.moi ? <EyeOff size={16} /> : <EyeIcon size={16} />}
                        </button>
                    </div>
                </div>

                {/* Confirm Password */}
                <div>
                    <label className="cd-field-label">Xác nhận mật khẩu mới</label>
                    <div className="cd-pw-wrapper">
                        <input
                            type={showPw.xacNhan ? 'text' : 'password'}
                            placeholder="Nhập lại mật khẩu mới"
                            value={pwForm.xacNhanMatKhau}
                            onChange={e => setPwForm(f => ({ ...f, xacNhanMatKhau: e.target.value }))}
                            required
                            className="cd-field-input"
                            style={{ paddingRight: '2.75rem' }}
                        />
                        <button type="button" onClick={() => setShowPw(s => ({ ...s, xacNhan: !s.xacNhan }))} className="cd-pw-toggle">
                            {showPw.xacNhan ? <EyeOff size={16} /> : <EyeIcon size={16} />}
                        </button>
                    </div>
                </div>

                <button type="submit" disabled={pwLoading} className="cd-btn cd-btn--primary cd-btn--submit">
                    <KeyRound size={16} />
                    {pwLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                </button>
            </form>
        </section>
    </div>
);

export default CustomerDashboard;
