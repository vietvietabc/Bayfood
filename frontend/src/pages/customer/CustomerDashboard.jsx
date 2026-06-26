import React, { useState } from 'react';
import api from '../../utils/axiosSetup';
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

import OverviewTab from './dashboard/OverviewTab';
import ReservationHistory from './dashboard/ReservationHistory';
import OrderHistory from './dashboard/OrderHistory';
import AccountTab from './dashboard/AccountTab';

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
        user, authLoading, loading, error, refetch,
        reservations, orders, reviews,
        activeReservations, activeOrders,
        checkinLoadingId, actionMessage, checkinToast,
        handleCheckin, handleCheckinOrder, handleCancelReservation,
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
            await api.put('/api/users/me/profile', profileForm);
            setProfileMsg({ type: 'success', text: 'Cập nhật thành công! Vui lòng tải lại trang.' });
        } catch (err) {
            setProfileMsg({ type: 'error', text: err.response?.data?.detail || err.message });
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
            await api.put('/api/users/me/password', { matKhauCu: pwForm.matKhauCu, matKhauMoi: pwForm.matKhauMoi });
            setPwMsg({ type: 'success', text: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại nếu cần.' });
            setPwForm({ matKhauCu: '', matKhauMoi: '', xacNhanMatKhau: '' });
        } catch (err) {
            setPwMsg({ type: 'error', text: err.response?.data?.detail || err.message });
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
            {error && (
                <div className="cd-banner cd-banner--error" style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
                    <span>{error}</span>
                    <button
                        onClick={refetch}
                        style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'inherit', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}
                    >
                        🔄 Thử lại
                    </button>
                </div>
            )}
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
                        <ReservationHistory
                            reservations={reservations}
                            orders={orders}
                            checkinLoadingId={checkinLoadingId}
                            handleCheckin={handleCheckin}
                            handleCancelReservation={handleCancelReservation}
                            handleViewReservation={handleViewReservation}
                            handleVNPayPayment={handleVNPayPayment}
                            setQrModal={setQrModal}
                        />
                    )}

                    {/* ═══ ORDERS ═══ */}
                    {activeTab === 'orders' && (
                        <OrderHistory
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
export default CustomerDashboard;
