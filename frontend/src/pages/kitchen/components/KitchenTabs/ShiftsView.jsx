import React from 'react';

const ShiftsView = ({ personalShifts, personalShiftsLoading }) => {
    if (personalShiftsLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
                <div style={{ width: '48px', height: '48px', border: '4px solid var(--hairline)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                Đang tải lịch sử ca làm...
            </div>
        );
    }

    if (personalShifts.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '5rem 2rem', borderRadius: 'var(--rounded-xl)', border: '2px dashed var(--hairline)', background: 'var(--surface-card)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏰</div>
                <h2 style={{ margin: '0 0 0.5rem' }}>Chưa có lịch sử ca làm</h2>
                <p style={{ color: 'var(--muted)', margin: 0 }}>Lịch sử check-in và tan ca của bạn sẽ được hiển thị tại đây.</p>
            </div>
        );
    }

    return (
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
    );
};

export default ShiftsView;
