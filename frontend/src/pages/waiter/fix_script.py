import re

filepath = r"c:\Users\DinhViet\Desktop\BayFood\frontend\src\pages\waiter\WaiterPage.jsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()


new_tabs = """                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                )}

                {/* Upcoming orders tab */}
                {activeTab === 'upcoming' && (
                    upcomingLoading ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
                            <div style={{ width: '48px', height: '48px', border: '4px solid var(--hairline)', borderTopColor: '#10b981', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                            Đang tải đơn sắp tới...
                        </div>
                    ) : upcomingOrders.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '5rem 2rem', borderRadius: 'var(--rounded-lg)', border: '2px dashed var(--hairline)', background: 'var(--surface-card)' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                            <h2 style={{ margin: '0 0 0.5rem' }}>Không có đơn đặt trước</h2>
                            <p style={{ color: 'var(--muted)', margin: 0 }}>Hiện chưa có khách nào đặt trước cho hôm nay.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
                            {upcomingOrders.map(order => {
                                const isArriving = order.soPhutConLai <= 30;
                                const isOverdue = order.soPhutConLai <= 0;
                                return (
                                    <div key={order.id_donHang} style={{
                                        background: 'var(--surface-card)', borderRadius: 'var(--rounded-lg)',
                                        border: isOverdue ? '1.5px solid rgba(239,68,68,0.5)' : isArriving ? '1.5px solid rgba(234,179,8,0.5)' : '1px solid var(--hairline)',
                                        overflow: 'hidden', display: 'flex', flexDirection: 'column',
                                    }}>
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
                                                    ⏰ {isOverdue ? 'Đã quá giờ' : `Còn ${order.soPhutConLai >= 60 ? Math.floor(order.soPhutConLai / 60) + 'h' + (order.soPhutConLai % 60 > 0 ? order.soPhutConLai % 60 + 'p' : '') : order.soPhutConLai + ' phút'}`}
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                                    Hẹn {order.thoiGianDen ? new Date(order.thoiGianDen).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                </span>
                                            </div>
                                        </div>
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
                    )
                )}

                {/* Tables tab */}
                {activeTab === 'tables' && (
                    tablesLoading ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
                            <div style={{ width: '48px', height: '48px', border: '4px solid var(--hairline)', borderTopColor: '#10b981', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                            Đang tải sơ đồ bàn...
                        </div>
                    ) : (() => {
                        const TABLE_STATUS = {
                            'Trống': { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', color: '#34d399', icon: '🟢' },
                            'Có khách': { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', color: '#f87171', icon: '🔴' },
                            'Đã đặt': { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.35)', color: '#fbbf24', icon: '🟡' },
                            'Đang phục vụ': { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', color: '#60a5fa', icon: '🔵' },
                        };
                        const grouped = tables.reduce((acc, t) => {
                            const loc = t.viTri || 'Khác';
                            if (!acc[loc]) acc[loc] = [];
                            acc[loc].push(t);
                            return acc;
                        }, {});
                        return (
                            <div>
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
                    })()
                )}

                {/* Schedule tab */}
                {activeTab === 'schedule' && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                            <button onClick={() => { const d = new Date(scheduleDate); d.setDate(d.getDate() - 1); const ds = d.toISOString().split('T')[0]; setScheduleDate(ds); fetchTimeline(ds); }}
                                style={{ padding: '0.4rem 0.8rem', borderRadius: 'var(--rounded-pill)', border: '1px solid var(--hairline)', background: 'var(--surface-card)', color: 'var(--muted)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>← Hôm trước</button>
                            <input type="date" value={scheduleDate} onChange={e => { setScheduleDate(e.target.value); fetchTimeline(e.target.value); }}
                                style={{ padding: '0.4rem 0.8rem', borderRadius: 'var(--rounded-pill)', border: '1px solid var(--hairline)', background: 'var(--surface-card)', color: 'var(--ink)', fontSize: '0.85rem', fontWeight: '600' }} />
                            <button onClick={() => { const d = new Date(scheduleDate); d.setDate(d.getDate() + 1); const ds = d.toISOString().split('T')[0]; setScheduleDate(ds); fetchTimeline(ds); }}
                                style={{ padding: '0.4rem 0.8rem', borderRadius: 'var(--rounded-pill)', border: '1px solid var(--hairline)', background: 'var(--surface-card)', color: 'var(--muted)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>Hôm sau →</button>
                            <button onClick={() => { const ds = new Date().toISOString().split('T')[0]; setScheduleDate(ds); fetchTimeline(ds); }}
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
                                                        const SLOT_STYLE = {
                                                            'available': { bg: 'transparent', color: 'var(--muted)', label: '' },
                                                            'occupied': { bg: 'rgba(239,68,68,0.12)', color: '#f87171', label: '🔴' },
                                                            'blocked': { bg: 'rgba(234,179,8,0.12)', color: '#fbbf24', label: '🟡' },
                                                            'warning': { bg: 'rgba(249,115,22,0.12)', color: '#fb923c', label: '🟠' },
                                                        };
                                                        const ss = SLOT_STYLE[slot.status] || SLOT_STYLE['available'];
                                                        return (
                                                            <td key={idx} style={{ padding: '0.4rem', textAlign: 'center', background: ss.bg, fontSize: '0.72rem', color: ss.color, fontWeight: slot.status !== 'available' ? '600' : '400' }}>
                                                                {slot.khach ? (
                                                                    <div title={`${slot.khach} - ${slot.soNguoi || ''} người`}>
                                                                        <div>{ss.label} {slot.khach}</div>
                                                                        {slot.soNguoi && <div style={{ fontSize: '0.65rem', opacity: 0.7 }}>{slot.soNguoi} người</div>}
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
                )}

            {/* MODAL THU NGÂN / CHEKOUT CHO PHỤC VỤ */}"""

pattern = re.compile(r"(\s+)\}\)\}\n\s+</thead>\n.*?(?=\s+\{\/\*\s+MODAL THU NGÂN \/ CHEKOUT CHO PHỤC VỤ \s+\*\/})", re.DOTALL)

if pattern.search(content):
    content = pattern.sub(new_tabs, content)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success")
else:
    print("Pattern not found")
