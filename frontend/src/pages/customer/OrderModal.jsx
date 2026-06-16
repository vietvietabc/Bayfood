import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Star, UtensilsCrossed, ChevronDown, History, RotateCcw } from 'lucide-react';
import { BASE_URL, formatDateTime, formatCurrency, getStatusStyle, getMonStatusColor } from './customerDashboardUtils';

/* Status filter options for dishes */
const MON_STATUS_OPTIONS = ['Tất cả', 'Chờ chế biến', 'Đang chế biến', 'Hoàn thành'];

const OrderModal = ({
    showOrderModal,
    orderDetailLoading,
    selectedOrder,
    reservations,
    handleCloseOrderModal,
    handleEditOrder,
    setShowOrderModal,
    setSelectedReservation,
    setShowReservationModal,
    showReviewModal,
    setShowReviewModal,
    reviewForm,
    setReviewForm,
    reviews,
}) => {
    const [monFilter, setMonFilter] = useState('Tất cả');

    // Hooks must be before any early return
    const filteredItems = useMemo(() => {
        if (!selectedOrder?.chi_tiet) return [];
        if (monFilter === 'Tất cả') return selectedOrder.chi_tiet;
        return selectedOrder.chi_tiet.filter(item => item.trangThaiMon === monFilter);
    }, [selectedOrder, monFilter]);

    const statusCounts = useMemo(() => {
        if (!selectedOrder?.chi_tiet) return {};
        return selectedOrder.chi_tiet.reduce((acc, item) => {
            const s = item.trangThaiMon || 'Khác';
            acc[s] = (acc[s] || 0) + 1;
            return acc;
        }, {});
    }, [selectedOrder]);

    if (!showOrderModal) return null;

    return createPortal(
        <div
            onClick={handleCloseOrderModal}
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                zIndex: 2000,
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'var(--surface)',
                    borderRadius: '1.25rem',
                    border: '1px solid var(--border)',
                    width: '100%',
                    maxWidth: '700px',
                    maxHeight: '90vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.55)',
                    animation: 'scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                }}
            >
                {/* ── Header ── */}
                <div style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--surface-light)',
                    borderRadius: '1.25rem 1.25rem 0 0',
                    flexShrink: 0,
                }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                        Chi Tiết Đơn Hàng {selectedOrder ? `#DH${selectedOrder.id_donHang}` : ''}
                    </h2>
                    <button
                        onClick={handleCloseOrderModal}
                        aria-label="Đóng"
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid var(--border)',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            padding: '0.35rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* ── Body ── */}
                <div style={{ overflowY: 'auto', padding: '1.5rem', flex: 1 }}>
                    {orderDetailLoading ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            <div style={{ width: '36px', height: '36px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 0.8s linear infinite' }} />
                            Đang tải chi tiết...
                        </div>
                    ) : selectedOrder ? (
                        <>
                            {/* Row 1: Nhân viên + Trạng thái */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{ padding: '1rem', borderRadius: '0.85rem', background: 'rgba(192,132,252,0.08)', border: '1px solid rgba(192,132,252,0.18)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', color: '#c084fc', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        <Star size={13} /> Nhân viên phục vụ
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>
                                        {selectedOrder.tenNhanVienPhucVu || <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontStyle: 'italic' }}>Chưa phân công</span>}
                                    </div>
                                </div>
                                <div style={{ padding: '1rem', borderRadius: '0.85rem', background: 'var(--surface-light)', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Trạng thái</div>
                                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.85rem', background: getStatusStyle(selectedOrder.tinhTrang).bg, color: getStatusStyle(selectedOrder.tinhTrang).color, fontWeight: 700 }}>
                                        {selectedOrder.tinhTrang}
                                    </span>
                                </div>
                            </div>

                            {/* Row 2: Bàn + Thời gian tạo */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{ padding: '1rem', borderRadius: '0.85rem', background: selectedOrder.id_ban ? 'rgba(52,211,153,0.08)' : 'var(--surface-light)', border: `1px solid ${selectedOrder.id_ban ? 'rgba(52,211,153,0.25)' : 'var(--border)'}` }}>
                                    <div style={{ fontSize: '0.75rem', color: selectedOrder.id_ban ? '#34d399' : 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        🪑 Bàn ngồi
                                    </div>
                                    <div style={{ fontWeight: 800, fontSize: '1.3rem', color: selectedOrder.id_ban ? '#34d399' : 'var(--text-muted)' }}>
                                        {selectedOrder.id_ban ? `Bàn số ${selectedOrder.id_ban}` : selectedOrder.id_datBan ? 'Đã đặt (chờ xếp chỗ)' : 'Chưa đặt bàn'}
                                    </div>
                                </div>
                                <div style={{ padding: '1rem', borderRadius: '0.85rem', background: 'var(--surface-light)', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Thời gian tạo đơn</div>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{formatDateTime(selectedOrder.thoiGianTao)}</div>
                                </div>
                            </div>

                            {/* Thời gian dự kiến */}
                            {selectedOrder.thoiGianDen && (
                                <div style={{ padding: '0.85rem 1rem', borderRadius: '0.85rem', background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.18)', marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginBottom: '0.25rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>🕐 Thời gian dự kiến tới</div>
                                    <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatDateTime(selectedOrder.thoiGianDen)}</div>
                                </div>
                            )}

                            {/* Liên kết đặt bàn */}
                            {selectedOrder.id_datBan && (
                                <div style={{ padding: '0.85rem 1rem', borderRadius: '0.85rem', background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.18)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: '#34d399', marginBottom: '0.25rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Đã liên kết lịch đặt bàn</div>
                                        <div style={{ fontWeight: 700, color: '#34d399' }}>Mã đặt bàn: #{selectedOrder.id_datBan}</div>
                                    </div>
                                    <button
                                        className="btn btn-outline"
                                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', color: '#34d399', borderColor: 'rgba(52,211,153,0.4)', borderRadius: '0.6rem' }}
                                        onClick={() => {
                                            setShowOrderModal(false);
                                            const res = reservations.find((r) => r.id_datBan === selectedOrder.id_datBan);
                                            if (res) { setSelectedReservation(res); setShowReservationModal(true); }
                                            else { alert('Không tìm thấy thông tin chi tiết đặt bàn!'); }
                                        }}
                                    >
                                        Xem chi tiết đặt bàn
                                    </button>
                                </div>
                            )}

                            {/* ─── Danh sách món ─── */}
                            <div style={{ marginBottom: '1.25rem' }}>
                                {/* Section header */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '-0.01em' }}>
                                        <UtensilsCrossed size={17} style={{ color: '#f97316' }} />
                                        Danh sách món ăn
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', padding: '0.1rem 0.55rem', borderRadius: '999px', background: 'var(--surface-light)', border: '1px solid var(--border)' }}>
                                            {selectedOrder.chi_tiet?.length || 0} món
                                        </span>
                                    </h3>

                                    {/* Status filter pills */}
                                    {selectedOrder.chi_tiet?.length > 0 && (
                                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            {MON_STATUS_OPTIONS.map(opt => {
                                                const isActive = monFilter === opt;
                                                const count = opt === 'Tất cả'
                                                    ? selectedOrder.chi_tiet.length
                                                    : (statusCounts[opt] || 0);
                                                const color = opt === 'Chờ chế biến' ? '#fbbf24'
                                                    : opt === 'Đang chế biến' ? '#60a5fa'
                                                    : opt === 'Hoàn thành' ? '#34d399'
                                                    : 'var(--text-muted)';
                                                return (
                                                    <button
                                                        key={opt}
                                                        onClick={() => setMonFilter(opt)}
                                                        style={{
                                                            padding: '0.3rem 0.75rem',
                                                            borderRadius: '999px',
                                                            border: isActive
                                                                ? `1px solid ${opt === 'Tất cả' ? 'rgba(249,115,22,0.35)' : color + '55'}`
                                                                : '1px solid var(--border)',
                                                            background: isActive
                                                                ? (opt === 'Tất cả' ? 'rgba(249,115,22,0.1)' : color + '18')
                                                                : 'transparent',
                                                            color: isActive ? (opt === 'Tất cả' ? '#f97316' : color) : 'var(--text-muted)',
                                                            fontSize: '0.78rem',
                                                            fontWeight: isActive ? 700 : 500,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.3rem',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {opt}
                                                        {count > 0 && (
                                                            <span style={{
                                                                minWidth: '18px', height: '18px',
                                                                borderRadius: '999px',
                                                                background: isActive
                                                                    ? (opt === 'Tất cả' ? 'rgba(249,115,22,0.15)' : color + '25')
                                                                    : 'var(--surface-light)',
                                                                color: isActive ? (opt === 'Tất cả' ? '#f97316' : color) : 'var(--text-muted)',
                                                                fontSize: '0.7rem',
                                                                fontWeight: 700,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                padding: '0 4px',
                                                            }}>
                                                                {count}
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Item list */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {filteredItems.length > 0
                                        ? filteredItems.map((item) => (
                                            <div
                                                key={item.id_chiTietDonHang}
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'auto 1fr auto',
                                                    gap: '0.85rem',
                                                    alignItems: 'center',
                                                    padding: '0.85rem',
                                                    borderRadius: '0.85rem',
                                                    background: 'var(--surface-light)',
                                                    border: '1px solid var(--border)',
                                                    transition: 'border-color 0.2s ease',
                                                }}
                                            >
                                                {/* Image */}
                                                <div style={{ width: '50px', height: '50px', borderRadius: '0.5rem', overflow: 'hidden', background: 'var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {item.hinhAnhMon
                                                        ? <img src={item.hinhAnhMon.startsWith('http') ? item.hinhAnhMon : `${BASE_URL}${item.hinhAnhMon.startsWith('/') ? '' : '/'}${item.hinhAnhMon}`} alt={item.tenMon} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                                                        : null}
                                                    <span style={{ fontSize: '1.3rem', display: item.hinhAnhMon ? 'none' : 'block' }}>🍽️</span>
                                                </div>

                                                {/* Info */}
                                                <div>
                                                    <div style={{ fontWeight: 700, marginBottom: '0.35rem', fontSize: '0.95rem' }}>{item.tenMon || `Món #${item.id_monAn}`}</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '999px', padding: '0.1rem 0.55rem' }}>
                                                            SL: <strong style={{ color: 'var(--text)' }}>{item.soLuong}</strong>
                                                        </span>
                                                        <span style={{
                                                            fontSize: '0.78rem',
                                                            fontWeight: 700,
                                                            color: getMonStatusColor(item.trangThaiMon),
                                                            background: item.trangThaiMon === 'Hoàn thành' ? 'rgba(52,211,153,0.1)'
                                                                : item.trangThaiMon === 'Đang chế biến' ? 'rgba(96,165,250,0.1)'
                                                                : item.trangThaiMon === 'Chờ chế biến' ? 'rgba(251,191,36,0.1)'
                                                                : 'rgba(255,255,255,0.04)',
                                                            border: `1px solid ${item.trangThaiMon === 'Hoàn thành' ? 'rgba(52,211,153,0.2)'
                                                                : item.trangThaiMon === 'Đang chế biến' ? 'rgba(96,165,250,0.2)'
                                                                : item.trangThaiMon === 'Chờ chế biến' ? 'rgba(251,191,36,0.2)'
                                                                : 'var(--border)'}`,
                                                            borderRadius: '999px',
                                                            padding: '0.1rem 0.55rem',
                                                        }}>
                                                            {item.trangThaiMon || 'Chưa rõ'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Price */}
                                                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                    <div style={{ fontWeight: 800, color: '#f97316', fontSize: '0.95rem' }}>
                                                        {formatCurrency(item.giaTaiThoiDiemBan * item.soLuong)}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                                        {formatCurrency(item.giaTaiThoiDiemBan)} × {item.soLuong}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                        : (
                                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem', borderRadius: '0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border)' }}>
                                                Không có món nào {monFilter !== 'Tất cả' ? `với trạng thái "${monFilter}"` : ''}.
                                            </div>
                                        )
                                    }
                                </div>
                            </div>

                            {/* Tổng tiền */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, rgba(249,115,22,0.09), rgba(234,179,8,0.06))', border: '1px solid rgba(249,115,22,0.25)' }}>
                                <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>Tổng tiền</span>
                                <span style={{ fontWeight: 800, fontSize: '1.35rem', color: '#f97316' }}>{formatCurrency(selectedOrder.tongTien)}</span>
                            </div>

                            {/* Lịch sử chỉnh sửa */}
                            {selectedOrder.lich_su_chi_tiet?.length > 0 && (
                                <div style={{ marginTop: '1.25rem' }}>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        marginBottom: '0.85rem',
                                        paddingBottom: '0.6rem',
                                        borderBottom: '1px dashed var(--border)',
                                    }}>
                                        <RotateCcw size={15} style={{ color: '#94a3b8' }} />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                                            Lịch sử chỉnh sửa
                                        </span>
                                        <span style={{
                                            fontSize: '0.72rem', fontWeight: 700,
                                            background: 'rgba(148,163,184,0.1)',
                                            border: '1px solid rgba(148,163,184,0.2)',
                                            color: '#94a3b8',
                                            borderRadius: '999px',
                                            padding: '0.1rem 0.5rem',
                                        }}>
                                            {selectedOrder.lich_su_chi_tiet.length} món đã được chỉnh sửa
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                        {selectedOrder.lich_su_chi_tiet.map((item) => (
                                            <div
                                                key={item.id_chiTietDonHang}
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'auto 1fr auto',
                                                    gap: '0.75rem',
                                                    alignItems: 'center',
                                                    padding: '0.65rem 0.85rem',
                                                    borderRadius: '0.75rem',
                                                    background: 'rgba(148,163,184,0.04)',
                                                    border: '1px dashed rgba(148,163,184,0.2)',
                                                    opacity: 0.7,
                                                }}
                                            >
                                                {/* Image */}
                                                <div style={{ width: '40px', height: '40px', borderRadius: '0.4rem', overflow: 'hidden', background: 'var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'grayscale(0.6)' }}>
                                                    {item.hinhAnhMon
                                                        ? <img src={item.hinhAnhMon.startsWith('http') ? item.hinhAnhMon : `${BASE_URL}${item.hinhAnhMon.startsWith('/') ? '' : '/'}${item.hinhAnhMon}`} alt={item.tenMon} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                                                        : null}
                                                    <span style={{ fontSize: '1rem', display: item.hinhAnhMon ? 'none' : 'block' }}>🍽️</span>
                                                </div>

                                                {/* Info */}
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-muted)', textDecoration: 'line-through', marginBottom: '0.2rem' }}>
                                                        {item.tenMon || `Món #${item.id_monAn}`}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.15)', borderRadius: '999px', padding: '0.1rem 0.45rem' }}>
                                                            SL: <strong style={{ color: '#94a3b8' }}>{item.soLuong}</strong>
                                                        </span>
                                                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.15)', borderRadius: '999px', padding: '0.1rem 0.45rem' }}>
                                                            Đã xóa
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Price (struck through) */}
                                                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                    <div style={{ fontWeight: 700, color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'line-through' }}>
                                                        {formatCurrency(item.giaTaiThoiDiemBan * item.soLuong)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                                        Những món trên đã được xóa khỏi đơn trong lần chỉnh sửa trước.
                                    </div>
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default OrderModal;
