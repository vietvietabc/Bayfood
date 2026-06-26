import React from 'react';

// ============================================================
// ScheduleView.jsx - Tab lịch trình timeline bàn
// ============================================================

const SLOT_STYLE = {
    'available':   { bg: 'transparent', color: 'var(--muted)', label: '' },
    'occupied':    { bg: 'rgba(239,68,68,0.12)', color: '#f87171', label: '🔴' },
    'blocked':     { bg: 'rgba(234,179,8,0.12)', color: '#fbbf24', label: '🟡' },
    'warning':     { bg: 'rgba(249,115,22,0.12)', color: '#fb923c', label: '🟠' },
    'past':        { bg: 'rgba(100,116,139,0.07)', color: 'var(--muted)', label: '' },
    'past-booked': { bg: 'rgba(100,116,139,0.1)', color: '#64748b', label: '⬜' },
};

const ScheduleView = ({ timeline, timelineLoading, scheduleDate, setScheduleDate, fetchTimeline }) => {
    const handlePrevDay = () => {
        const d = new Date(scheduleDate);
        d.setDate(d.getDate() - 1);
        const ds = d.toISOString().split('T')[0];
        setScheduleDate(ds);
        fetchTimeline(ds);
    };

    const handleNextDay = () => {
        const d = new Date(scheduleDate);
        d.setDate(d.getDate() + 1);
        const ds = d.toISOString().split('T')[0];
        setScheduleDate(ds);
        fetchTimeline(ds);
    };

    const handleToday = () => {
        const ds = new Date().toISOString().split('T')[0];
        setScheduleDate(ds);
        fetchTimeline(ds);
    };

    return (
        <div>
            {/* Date picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button onClick={handlePrevDay}
                    style={{ padding: '0.4rem 0.8rem', borderRadius: 'var(--rounded-pill)', border: '1px solid var(--hairline)', background: 'var(--surface-card)', color: 'var(--muted)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>← Hôm trước</button>
                <input type="date" value={scheduleDate} onChange={e => { setScheduleDate(e.target.value); fetchTimeline(e.target.value); }}
                    style={{ padding: '0.4rem 0.8rem', borderRadius: 'var(--rounded-pill)', border: '1px solid var(--hairline)', background: 'var(--surface-card)', color: 'var(--ink)', fontSize: '0.85rem', fontWeight: '600' }} />
                <button onClick={handleNextDay}
                    style={{ padding: '0.4rem 0.8rem', borderRadius: 'var(--rounded-pill)', border: '1px solid var(--hairline)', background: 'var(--surface-card)', color: 'var(--muted)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>Hôm sau →</button>
                <button onClick={handleToday}
                    style={{ padding: '0.4rem 0.8rem', borderRadius: 'var(--rounded-pill)', border: '1px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.12)', color: '#34d399', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}>Hôm nay</button>
            </div>

            {timelineLoading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
                    <div style={{ width: '48px', height: '48px', border: '4px solid var(--hairline)', borderTopColor: '#10b981', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                    Đang tải lịch trình...
                </div>
            ) : !timeline || timeline.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '5rem 2rem', borderRadius: 'var(--rounded-lg)', border: '2px dashed var(--hairline)', background: 'var(--surface-card)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
                    <h2 style={{ margin: '0 0 0.5rem' }}>Không có dữ liệu lịch trình</h2>
                    <p style={{ color: 'var(--muted)', margin: 0 }}>Chưa có đặt bàn nào cho ngày này.</p>
                </div>
            ) : (
                <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--rounded-lg)', border: '1px solid var(--hairline)', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--hairline)', background: 'var(--surface-soft)' }}>
                                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', fontWeight: '700', color: 'var(--muted)', textAlign: 'left', position: 'sticky', left: 0, background: 'var(--surface-soft)', zIndex: 1 }}>Bàn</th>
                                    {timeline.length > 0 && timeline[0].slots && timeline[0].slots.map((slot, idx) => (
                                        <th key={idx} style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem', fontWeight: '600', color: 'var(--muted)', textAlign: 'center', minWidth: '100px' }}>
                                            {slot.time}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {timeline.map(row => (
                                    <tr key={row.id_ban} style={{ borderBottom: '1px solid var(--hairline)' }}>
                                        <td style={{ padding: '0.65rem 1rem', fontWeight: '700', fontSize: '0.85rem', color: 'var(--ink)', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: 'var(--surface-card)', zIndex: 1 }}>
                                            {row.tenBan}
                                            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontWeight: '400' }}>{row.sucChua} người</div>
                                        </td>
                                        {row.slots && row.slots.map((slot, idx) => {
                                            const ss = SLOT_STYLE[slot.status] || SLOT_STYLE['available'];
                                            const isPast = slot.status === 'past' || slot.status === 'past-booked';
                                            return (
                                                <td key={idx} style={{ padding: '0.4rem', textAlign: 'center', background: ss.bg, fontSize: '0.72rem', color: ss.color, fontWeight: slot.status !== 'available' && !isPast ? '600' : '400', opacity: isPast ? 0.5 : 1 }}>
                                                    {slot.khach && !isPast ? (
                                                        <div title={`${slot.khach} - ${slot.soNguoi || ''} người`}>
                                                            <div>{ss.label} {slot.khach}</div>
                                                            {slot.soNguoi && <div style={{ fontSize: '0.65rem', opacity: 0.7 }}>{slot.soNguoi} người</div>}
                                                        </div>
                                                    ) : isPast && slot.khach ? (
                                                        <div title={`${slot.khach}${slot.reservationStatus ? ' — ' + slot.reservationStatus : ''}`}>
                                                            <div style={{ fontSize: '0.65rem' }}>Đã qua</div>
                                                            <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>{slot.khach}</div>
                                                            {slot.reservationStatus && (
                                                                <div style={{ fontSize: '0.58rem', opacity: 0.55, fontStyle: 'italic' }}>
                                                                    {slot.reservationStatus === 'Hoàn thành' ? '✓ HT' : slot.reservationStatus === 'Vắng mặt' ? '✗ VM' : slot.reservationStatus}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span style={{ opacity: 0.3 }}>—</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScheduleView;
