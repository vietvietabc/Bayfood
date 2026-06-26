import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ClipboardList, Clock3, Edit3, Eye, MapPin, Star, CheckCheck } from 'lucide-react';
import { formatDateTime, getStatusStyle } from '../customerDashboardUtils';

const OrderHistory = ({ orders, reservations, checkinLoadingId, handleViewOrder, handleEditOrder, handleCheckinOrder, setShowReviewModal, setReviewForm }) => {
    const [filter, setFilter] = React.useState('Tất cả');
    const STATUSES = ['Tất cả', 'Chờ xác nhận', 'Chờ khách đến', 'Đang xử lý', 'Đã thanh toán', 'Đã hủy', 'Vắng mặt'];

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

export default OrderHistory;
