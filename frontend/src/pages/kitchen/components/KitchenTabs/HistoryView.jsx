import React from 'react';
import { BASE_URL } from '../KitchenConstants';

const HistoryView = ({ historyOrders, historyLoading }) => {
    if (historyLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
                <div style={{ width: '48px', height: '48px', border: '4px solid var(--hairline)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                Đang tải lịch sử đơn hàng đã làm...
            </div>
        );
    }

    if (historyOrders.length === 0) {
        return (
            <div style={{
                textAlign: 'center', padding: '5rem 2rem',
                borderRadius: 'var(--rounded-lg)', border: '2px dashed var(--hairline)',
                background: 'var(--surface-card)',
            }}>
                <h2 style={{ margin: '0 0 0.5rem', color: 'var(--ink)' }}>Chưa làm đơn hàng nào</h2>
                <p style={{ color: 'var(--muted)' }}>Bạn chưa hoàn thành chế biến món ăn nào hoặc chưa có đơn hàng nào hoàn thành gần đây.</p>
            </div>
        );
    }

    return (
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
                                    Xong
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
    );
};

export default HistoryView;
