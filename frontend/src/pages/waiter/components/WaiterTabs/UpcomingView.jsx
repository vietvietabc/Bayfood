import React from 'react';
import { fmtMoney, BASE_URL } from '../WaiterConstants';

// ============================================================
// UpcomingView.jsx - Tab đơn hàng sắp tới
// ============================================================

const UpcomingView = ({ upcomingOrders, upcomingLoading }) => {
    if (upcomingLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
                <div style={{ width: '48px', height: '48px', border: '4px solid var(--hairline)', borderTopColor: '#10b981', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                Đang tải đơn sắp tới...
            </div>
        );
    }

    if (upcomingOrders.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '5rem 2rem', borderRadius: 'var(--rounded-lg)', border: '2px dashed var(--hairline)', background: 'var(--surface-card)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                <h2 style={{ margin: '0 0 0.5rem' }}>Không có đơn đặt trước</h2>
                <p style={{ color: 'var(--muted)', margin: 0 }}>Hiện chưa có khách nào đặt trước cho hôm nay.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
            {upcomingOrders.map(order => {
                const isArriving = order.soPhutConLai <= 30;
                const isOverdue = order.soPhutConLai <= 0;
                let remainingText = '';
                if (isOverdue) {
                    remainingText = 'Đã quá giờ';
                } else {
                    if (order.soPhutConLai >= 60) {
                        const h = Math.floor(order.soPhutConLai / 60);
                        const m = order.soPhutConLai % 60;
                        remainingText = `Còn ${h}h` + (m > 0 ? `${m}p` : '');
                    } else {
                        remainingText = `Còn ${order.soPhutConLai} phút`;
                    }
                }
                return (
                    <div key={order.id_donHang} style={{
                        background: 'var(--surface-card)', borderRadius: 'var(--rounded-lg)',
                        border: isOverdue ? '1.5px solid rgba(239,68,68,0.5)' : isArriving ? '1.5px solid rgba(234,179,8,0.5)' : '1px solid var(--hairline)',
                        overflow: 'hidden', display: 'flex', flexDirection: 'column',
                    }}>
                        {/* Header */}
                        <div style={{ padding: '1rem 1.25rem', background: isOverdue ? 'rgba(239,68,68,0.07)' : isArriving ? 'rgba(234,179,8,0.07)' : 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--ink)' }}>
                                        {order.tenBan || (order.id_ban ? `Bàn ${order.id_ban}` : 'Chưa xếp bàn')}
                                    </span>
                                    <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>#{order.id_donHang}</span>
                                    {order.trangThaiCoc === 'Đã cọc' && (
                                        <span style={{ padding: '0.15rem 0.5rem', borderRadius: '0.25rem', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', fontSize: '0.68rem', fontWeight: '700' }}>Đã cọc</span>
                                    )}
                                </div>
                                {order.tenKhach && <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>👤 {order.tenKhach}{order.soDienThoai ? ` · ${order.soDienThoai}` : ''}</div>}
                                {order.soNguoi && <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.15rem' }}>👥 {order.soNguoi} người</div>}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: 'var(--rounded-pill)', background: isOverdue ? 'rgba(239,68,68,0.15)' : isArriving ? 'rgba(234,179,8,0.15)' : 'rgba(59,130,246,0.15)', border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.35)' : isArriving ? 'rgba(234,179,8,0.35)' : 'rgba(59,130,246,0.35)'}`, color: isOverdue ? '#f87171' : isArriving ? '#fbbf24' : '#60a5fa', fontSize: '0.75rem', fontWeight: '700' }}>
                                    ⏰ {remainingText}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                    Hẹn {order.thoiGianDen ? new Date(order.thoiGianDen).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                </span>
                            </div>
                        </div>

                        {/* Items */}
                        <div style={{ padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {order.chi_tiet.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', borderRadius: 'var(--rounded-pill)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--hairline)' }}>
                                    {item.hinhAnh && (
                                        <div style={{ width: '32px', height: '32px', borderRadius: '0.35rem', overflow: 'hidden', flexShrink: 0 }}>
                                            <img src={`${BASE_URL}${item.hinhAnh}`} alt={item.tenMon} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                                        </div>
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--ink)' }}>{item.tenMon}</span>
                                        <span style={{ color: 'var(--muted)', fontWeight: '400', marginLeft: '0.35rem' }}>x{item.soLuong}</span>
                                    </div>
                                    <strong style={{ color: 'var(--ink)', fontSize: '0.82rem' }}>{fmtMoney(item.giaTaiThoiDiemBan * item.soLuong)}</strong>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--hairline)', background: 'var(--surface-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                                {order.chi_tiet.length} món{order.ghiChu ? ` · ${order.ghiChu}` : ''}
                            </span>
                            <strong style={{ color: '#10b981', fontSize: '0.95rem' }}>{fmtMoney(order.tongTien)}</strong>
                        </div>
                        {order.tienCoc > 0 && (
                            <div style={{ padding: '0.4rem 1.25rem', background: 'rgba(16,185,129,0.05)', borderTop: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#34d399' }}>
                                <span>Tiền cọc:</span>
                                <span>{fmtMoney(order.tienCoc)}</span>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default UpcomingView;
