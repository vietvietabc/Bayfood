import React from 'react';
import { fmtMoney, formatDate, formatTime, ITEM_STATUS_STYLE, BASE_URL } from '../WaiterConstants';
import { StatusBadge } from '../WaiterConstants';

// ============================================================
// HistoryView.jsx - Tab lịch sử đơn phục vụ
// ============================================================

const HistoryView = ({ historyOrders, historyLoading, expandedOrder, setExpandedOrder }) => {
    if (historyLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
                <div style={{ width: '48px', height: '48px', border: '4px solid var(--hairline)', borderTopColor: '#10b981', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                Đang tải lịch sử...
            </div>
        );
    }

    if (historyOrders.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '5rem 2rem', borderRadius: 'var(--rounded-lg)', border: '2px dashed var(--hairline)', background: 'var(--surface-card)' }}>
                <h2 style={{ margin: '0 0 0.5rem' }}>Chưa có lịch sử</h2>
                <p style={{ color: 'var(--muted)', margin: 0 }}>Chưa có đơn hàng nào hoàn thành.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
            {historyOrders.map(order => {
                const isExpanded = expandedOrder === order.id_donHang;
                return (
                    <div key={order.id_donHang} style={{
                        background: 'var(--surface-card)',
                        borderRadius: 'var(--rounded-lg)',
                        border: order.isMyOrder ? '1.5px solid rgba(16,185,129,0.35)' : '1px solid var(--hairline)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: 'none',
                        transition: 'all 0.25s'
                    }}>
                        <div style={{ padding: '1rem 1.25rem', background: 'var(--surface-soft)', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.2rem' }}>
                                    {order.id_ban ? `Bàn ${order.id_ban}` : 'Mang về'} <span style={{ color: 'var(--muted)', fontWeight: '400', fontSize: '0.8rem' }}>#{order.id_donHang}</span>
                                </div>
                                {order.tenKhachHang && <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Khách: {order.tenKhachHang}</div>}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                                <StatusBadge status={order.tinhTrang} />
                                {order.isMyOrder && <span style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: '700' }}>Bạn phục vụ</span>}
                            </div>
                        </div>

                        {/* Summary row with toggle */}
                        <div style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                {(order.chi_tiet || []).slice(0, 3).map((item, idx) => {
                                    const s = ITEM_STATUS_STYLE[item.trangThaiMon] || { color: 'var(--muted)', bg: 'transparent', border: 'var(--hairline)' };
                                    return (
                                        <span key={idx} style={{ padding: '0.2rem 0.55rem', borderRadius: 'var(--rounded-pill)', background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontSize: '0.72rem', fontWeight: '600' }}>
                                            {item.tenMon} x{item.soLuong}
                                        </span>
                                    );
                                })}
                                {(order.chi_tiet || []).length > 3 && (
                                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>+{(order.chi_tiet || []).length - 3} món</span>
                                )}
                            </div>
                            <button onClick={() => setExpandedOrder(isExpanded ? null : order.id_donHang)}
                                style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.5rem', borderRadius: '0.5rem', transition: 'all 0.15s' }}>
                                {isExpanded ? '▲ Thu gọn' : '▼ Chi tiết'}
                            </button>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                            <div style={{ padding: '0 1.25rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {(order.chi_tiet || []).map((item, idx) => {
                                    const s = ITEM_STATUS_STYLE[item.trangThaiMon] || { color: 'var(--muted)', bg: 'rgba(255,255,255,0.03)', border: 'var(--hairline)' };
                                    return (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem', borderRadius: 'var(--rounded-pill)', background: s.bg, border: `1px solid ${s.border}` }}>
                                            {item.hinhAnh && (
                                                <div style={{ width: '36px', height: '36px', borderRadius: '0.4rem', overflow: 'hidden', flexShrink: 0 }}>
                                                    <img src={`${BASE_URL}${item.hinhAnh}`} alt={item.tenMon} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                                                </div>
                                            )}
                                            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: '600', fontSize: '0.88rem', color: 'var(--ink)' }}>{item.tenMon} <span style={{ color: 'var(--muted)', fontWeight: '400' }}>x{item.soLuong}</span></div>
                                                    <div style={{ fontSize: '0.73rem', color: s.color, fontWeight: '600', marginTop: '0.1rem' }}>{item.trangThaiMon}</div>
                                                </div>
                                                <strong style={{ color: 'var(--ink)', fontSize: '0.88rem' }}>{fmtMoney(item.giaTaiThoiDiemBan * item.soLuong)}</strong>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Bill Total in Expanded view */}
                                {(() => {
                                    const orderTotal = order.tongTien || (order.chi_tiet || []).reduce((sum, item) => sum + (item.giaTaiThoiDiemBan || 0) * (item.soLuong || 0), 0);
                                    const daCoc = order.trangThaiCoc === 'Đã cọc' ? (order.tienCoc || 0) : 0;
                                    const daThanhToan = Math.max(daCoc, order.tongThanhToan || 0);
                                    const tienThua = Math.max(0, daThanhToan - orderTotal);
                                    const conLai = Math.max(0, orderTotal - daThanhToan);
                                    return (
                                        <div style={{ borderTop: '1px dashed var(--hairline)', paddingTop: '0.75rem', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.82rem', color: 'var(--muted)', fontWeight: 'bold' }}>TỔNG HÓA ĐƠN:</span>
                                                <strong style={{ fontSize: '1rem', color: '#10b981' }}>{fmtMoney(orderTotal)}</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                                <span style={{ color: 'var(--muted)' }}>Khách đã trả{daCoc > 0 ? ' (gồm cọc)' : ''}:</span>
                                                <strong style={{ color: '#34d399' }}>{fmtMoney(daThanhToan)}</strong>
                                            </div>
                                            {tienThua > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: '0.6rem', background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)' }}>
                                                    <span style={{ fontSize: '0.82rem', color: '#f97316', fontWeight: '700' }}>⚠ Tiền thừa cần trả lại:</span>
                                                    <strong style={{ color: '#f97316' }}>{fmtMoney(tienThua)}</strong>
                                                </div>
                                            )}
                                            {conLai > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                                    <span style={{ color: 'var(--muted)' }}>Còn cần thu:</span>
                                                    <strong style={{ color: '#f87171' }}>{fmtMoney(conLai)}</strong>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Footer with dates */}
                        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--hairline)', background: 'var(--surface-soft)', fontSize: '0.75rem', color: 'var(--muted)', display: 'grid', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Đặt: {formatDate(order.thoiGianTao)}</span>
                                <span>{order.soMon} món</span>
                            </div>
                            {order.thoiGianHoanThanh && (
                                <div style={{ color: '#34d399', fontWeight: '500' }}>
                                    Hoàn thành: {formatDate(order.thoiGianHoanThanh)}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default HistoryView;
