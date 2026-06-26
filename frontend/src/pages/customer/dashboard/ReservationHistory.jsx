import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, Clock3, MapPinned, UserCircle2, CreditCard, Eye } from 'lucide-react';
import { formatDateTime, getStatusStyle } from '../customerDashboardUtils';

const ReservationHistory = ({ reservations, orders, checkinLoadingId, handleCheckin, handleCancelReservation, handleViewReservation, handleVNPayPayment, setQrModal }) => {
    const [filter, setFilter] = React.useState('Tất cả');
    const STATUSES = ['Tất cả', 'Chờ xác nhận', 'Đã đặt', 'Đã xác nhận', 'Đã checkin', 'Hoàn thành', 'Đã hủy', 'Vắng mặt'];

    // Cancel modal state
    const [cancelModal, setCancelModal] = React.useState(null);
    const [cancelReason, setCancelReason] = React.useState('');
    const [cancelLoading, setCancelLoading] = React.useState(false);
    const [cancelError, setCancelError] = React.useState('');

    const openCancelModal = (res) => {
        setCancelModal({ id_datBan: res.id_datBan, tenBan: res.id_ban, tienCoc: res.tienCoc, trangThaiCoc: res.trangThaiCoc });
        setCancelReason('');
        setCancelError('');
    };
    const closeCancelModal = () => { setCancelModal(null); setCancelReason(''); setCancelError(''); };

    const handleConfirmCancel = async () => {
        if (!cancelReason.trim()) { setCancelError('Vui lòng nhập lý do hủy.'); return; }
        setCancelLoading(true);
        setCancelError('');
        try {
            await handleCancelReservation(cancelModal.id_datBan, cancelReason.trim());
            closeCancelModal();
        } catch (err) {
            setCancelError(err.message || 'Không thể hủy đơn lúc này.');
        } finally {
            setCancelLoading(false);
        }
    };

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
                                    {res.ghiChu && (() => {
                                        const lines = res.ghiChu.split('\n').filter(l => l.trim());
                                        return lines.map((line, i) => line.includes('[GHÉP BÀN]') ? (
                                            <span key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', padding: '0.4rem 0.7rem', borderRadius: '0.5rem', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa', fontWeight: 600, fontSize: '0.82rem', marginTop: '0.2rem' }}>
                                                🪑 {line.replace('[GHÉP BÀN]', '').trim()}
                                            </span>
                                        ) : (
                                            <span key={i} className="cd-item-row">📝 Ghi chú: {line}</span>
                                        ));
                                    })()}

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
                                    {['Đã đặt', 'Chờ xác nhận', 'Đã xác nhận'].includes(res.trangThai) && (() => {
                                        const deadline = new Date(new Date(res.thoiGianDen).getTime() - 60 * 60 * 1000);
                                        const canCancel = new Date() < deadline;
                                        return (
                                            <button
                                                className="cd-btn cd-btn--cancel"
                                                onClick={() => canCancel && openCancelModal(res)}
                                                disabled={!canCancel}
                                                title={canCancel ? '' : 'Đã quá thời hạn hủy (phải hủy trước giờ đặt ít nhất 1 tiếng)'}
                                                style={{ opacity: canCancel ? 1 : 0.45, cursor: canCancel ? 'pointer' : 'not-allowed' }}
                                            >
                                                ✕ Hủy đơn
                                            </button>
                                        );
                                    })()}
                                </div>

                                {res.trangThai === 'Chờ xác nhận' && <div className="cd-item-note cd-item-note--pending">Bàn đang chờ admin xác nhận, chưa thể check-in.</div>}
                                {res.trangThai === 'Đã đặt' && <div className="cd-item-note cd-item-note--booked">Bàn đã được đặt, chờ admin xác nhận trước khi check-in.</div>}
                                {res.trangThai === 'Đã checkin' && <div className="cd-item-note cd-item-note--checkedin">Đã check-in, admin đã nhận thông báo.</div>}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Modal Xác nhận Hủy Đơn ── */}
            {cancelModal && (
                <div style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 99999, padding: '1rem',
                }}>
                    <div style={{
                        background: 'var(--surface)', borderRadius: '1.25rem',
                        padding: '2rem', maxWidth: '440px', width: '100%',
                        border: '1px solid rgba(239,68,68,0.25)',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
                        animation: 'scaleIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.6rem' }}>🚫</div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f87171', marginBottom: '0.4rem' }}>
                                Hủy đơn đặt bàn #{cancelModal.id_datBan}?
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                                Hành động này không thể hoàn tác.
                                {cancelModal.trangThaiCoc === 'Đã cọc' && cancelModal.tienCoc > 0 && (
                                    <span style={{ display: 'block', marginTop: '0.5rem', color: '#fbbf24', fontWeight: 600 }}>
                                        ⚠️ Bạn đã cọc {Number(cancelModal.tienCoc).toLocaleString('vi-VN')} ₫ — tiền cọc có thể bị giữ lại theo chính sách nhà hàng.
                                    </span>
                                )}
                            </p>
                        </div>

                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.45rem', color: 'var(--text-muted)' }}>
                                Lý do hủy <span style={{ color: '#f87171' }}>*</span>
                            </label>
                            <textarea
                                rows={3}
                                value={cancelReason}
                                onChange={e => { setCancelReason(e.target.value); setCancelError(''); }}
                                placeholder="Ví dụ: Thay đổi kế hoạch, có việc đột xuất..."
                                style={{
                                    width: '100%', borderRadius: '0.75rem',
                                    padding: '0.75rem 1rem', fontSize: '0.9rem',
                                    border: cancelError ? '1.5px solid #f87171' : '1px solid var(--border)',
                                    background: 'var(--surface-light)', color: 'var(--text)',
                                    resize: 'vertical', outline: 'none', fontFamily: 'inherit',
                                    boxSizing: 'border-box', lineHeight: 1.5,
                                }}
                            />
                            {cancelError && (
                                <div style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '0.3rem' }}>{cancelError}</div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={closeCancelModal}
                                disabled={cancelLoading}
                                style={{
                                    flex: 1, padding: '0.8rem', borderRadius: '0.85rem',
                                    border: '1px solid var(--border)', background: 'var(--surface-light)',
                                    color: 'var(--text)', fontWeight: 600, cursor: 'pointer',
                                    fontSize: '0.9rem', opacity: cancelLoading ? 0.6 : 1,
                                    transition: 'all 0.2s',
                                }}
                            >
                                Không, giữ nguyên
                            </button>
                            <button
                                onClick={handleConfirmCancel}
                                disabled={cancelLoading}
                                style={{
                                    flex: 1, padding: '0.8rem', borderRadius: '0.85rem',
                                    border: 'none',
                                    background: cancelLoading ? '#7f1d1d' : 'linear-gradient(135deg,#ef4444,#b91c1c)',
                                    color: '#fff', fontWeight: 700,
                                    cursor: cancelLoading ? 'not-allowed' : 'pointer',
                                    fontSize: '0.9rem',
                                    boxShadow: '0 4px 16px rgba(239,68,68,0.35)',
                                    transition: 'opacity 0.2s',
                                    opacity: cancelLoading ? 0.7 : 1,
                                }}
                            >
                                {cancelLoading ? 'Đang hủy...' : '✕ Xác nhận hủy'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ReservationHistory;
