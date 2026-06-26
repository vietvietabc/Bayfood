import React from 'react';

// ============================================================
// TablesView.jsx - Sơ đồ bàn
// ============================================================

const TABLE_STATUS = {
    'Trống': { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', color: '#34d399', icon: '🟢' },
    'Có khách': { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', color: '#f87171', icon: '🔴' },
    'Đã đặt': { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.35)', color: '#fbbf24', icon: '🟡' },
    'Đang phục vụ': { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', color: '#60a5fa', icon: '🔵' },
};

const TablesView = ({ tables, tablesLoading }) => {
    if (tablesLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
                <div style={{ width: '48px', height: '48px', border: '4px solid var(--hairline)', borderTopColor: '#10b981', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                Đang tải sơ đồ bàn...
            </div>
        );
    }

    const grouped = tables.reduce((acc, t) => {
        const loc = t.viTri || 'Khác';
        if (!acc[loc]) acc[loc] = [];
        acc[loc].push(t);
        return acc;
    }, {});

    return (
        <div>
            {/* Legend */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {Object.entries(TABLE_STATUS).map(([status, s]) => (
                    <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: s.color, fontWeight: '600' }}>
                        <span>{s.icon}</span> {status} ({tables.filter(t => t.trangThai === status).length})
                    </div>
                ))}
            </div>
            {Object.entries(grouped).map(([location, locationTables]) => (
                <div key={location} style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--ink)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📍 {location}
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: '400' }}>({locationTables.length} bàn)</span>
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                        {locationTables.map(table => {
                            const s = TABLE_STATUS[table.trangThai] || TABLE_STATUS['Trống'];
                            return (
                                <div key={table.id_ban} style={{
                                    background: s.bg, border: `1.5px solid ${s.border}`,
                                    borderRadius: 'var(--rounded-lg)', padding: '1rem',
                                    display: 'flex', flexDirection: 'column', gap: '0.35rem',
                                    transition: 'all 0.2s',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--ink)' }}>{table.tenBan}</span>
                                        <span style={{ fontSize: '0.7rem' }}>{s.icon}</span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Sức chứa: {table.sucChua} người</div>
                                    <div style={{ fontSize: '0.72rem', color: s.color, fontWeight: '700', marginTop: '0.15rem' }}>{table.trangThai}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TablesView;
