import re

filepath = r"c:\Users\DinhViet\Desktop\BayFood\frontend\src\pages\kitchen\KitchenPage.jsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace 1: States
old_states = """    const [historyLoading, setHistoryLoading] = useState(false);"""
new_states = """    const [historyLoading, setHistoryLoading] = useState(false);
    
    const [upcomingOrders, setUpcomingOrders] = useState([]);
    const [upcomingLoading, setUpcomingLoading] = useState(false);"""
content = content.replace(old_states, new_states)

# Replace 2: fetchUpcoming function
old_fetch = """    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const res = await axios.get(`${BASE_URL}/api/donhang/kitchen/history`);
            setHistoryOrders(res.data);
        } catch (err) {
            console.error('Lỗi tải lịch sử bếp:', err);
        } finally {
            setHistoryLoading(false);
        }
    }, []);"""
new_fetch = old_fetch + """

    const fetchUpcoming = useCallback(async () => {
        setUpcomingLoading(true);
        try {
            const res = await axios.get(`${BASE_URL}/api/donhang/kitchen/upcoming`);
            setUpcomingOrders(res.data);
        } catch (err) {
            console.error('Lỗi tải đơn sắp tới:', err);
        } finally {
            setUpcomingLoading(false);
        }
    }, []);"""
content = content.replace(old_fetch, new_fetch)

# Replace 3: useEffect autoRefresh
old_effect = """    // Auto-refresh active orders every 20 seconds only when on the active tab
    useEffect(() => {
        if (!autoRefresh || activeTab !== 'active') return;
        const interval = setInterval(fetchOrders, 20000);
        return () => clearInterval(interval);
    }, [autoRefresh, activeTab, fetchOrders]);"""
new_effect = """    // Auto-refresh active orders every 20 seconds only when on the active tab
    useEffect(() => {
        if (!autoRefresh) return;
        if (activeTab !== 'active' && activeTab !== 'upcoming') return;
        const fn = activeTab === 'active' ? fetchOrders : fetchUpcoming;
        const interval = setInterval(fn, 20000);
        return () => clearInterval(interval);
    }, [autoRefresh, activeTab, fetchOrders, fetchUpcoming]);"""
content = content.replace(old_effect, new_effect)

# Replace 4: The Tabs button
old_button = """                    <button
                        onClick={() => { setActiveTab('history'); fetchHistory(); }}"""
new_button = """                    <button
                        onClick={() => { setActiveTab('upcoming'); fetchUpcoming(); }}
                        style={{
                            padding: '0.55rem 1.4rem',
                            borderRadius: 'var(--rounded-pill)',
                            border: activeTab === 'upcoming' ? 'none' : '1px solid var(--hairline)',
                            background: activeTab === 'upcoming' ? 'var(--primary)' : 'var(--surface-card)',
                            color: activeTab === 'upcoming' ? '#fff' : 'var(--muted)',
                            fontWeight: '700',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: activeTab === 'upcoming' ? '0 4px 14px rgba(94,106,210,0.3)' : 'none',
                        }}
                    >
                        Đơn sắp tới ({upcomingOrders.length})
                    </button>
                    <button
                        onClick={() => { setActiveTab('history'); fetchHistory(); }}"""
content = content.replace(old_button, new_button)

# Replace 5: The Tab content
old_tab = """                {activeTab === 'history' && ("""
new_tab = """                {activeTab === 'upcoming' && (
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
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--hairline)', background: 'var(--surface-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                                                {order.chi_tiet.length} món{order.ghiChu ? ` · ${order.ghiChu}` : ''}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}

                {activeTab === 'history' && ("""
content = content.replace(old_tab, new_tab)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated KitchenPage successfully")
