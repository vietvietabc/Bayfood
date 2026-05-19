import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const STATUS_FLOW = ['Đang chờ món', 'Đang chế biến', 'Đã phục vụ', 'Đã thanh toán'];

const formatTime = (v) => !v ? '-' : new Date(v).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const formatDate = (v) => !v ? '-' : new Date(v).toLocaleString('vi-VN');
const getElapsedMinutes = (t) => !t ? 0 : Math.floor((Date.now() - new Date(t).getTime()) / 60000);
const fmtMoney = (v) => v != null ? Number(v).toLocaleString('vi-VN') + ' ₫' : '0 ₫';

const STATUS_STYLE = {
    'Đang chờ món': { bg: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.35)', color: '#fbbf24', dot: '#f59e0b' },
    'Đang chế biến': { bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.35)', color: '#fb923c', dot: '#f97316' },
    'Đã phục vụ': { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.35)', color: '#34d399', dot: '#10b981' },
    'Đã thanh toán': { bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.35)', color: '#c084fc', dot: '#a855f7' },
};

const ITEM_STATUS_STYLE = {
    'Chờ chế biến': { color: '#fbbf24', bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.25)' },
    'Đang chế biến': { color: '#fb923c', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.25)' },
    'Hoàn thành': { color: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' },
};


const StatusBadge = ({ status }) => {
    const s = STATUS_STYLE[status] || { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', dot: '#888' };
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: 'var(--rounded-pill)', background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontSize: '0.75rem', fontWeight: '700' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
            {status}
        </span>
    );
};

const WaiterPage = () => {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [historyOrders, setHistoryOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('active');
    const [updatingId, setUpdatingId] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [shiftData, setShiftData] = useState(null);
    const [shiftLoading, setShiftLoading] = useState(false);
    const [personalShifts, setPersonalShifts] = useState([]);
    const [personalShiftsLoading, setPersonalShiftsLoading] = useState(false);

    // Checkout/Cashier modal state
    const [checkoutOrder, setCheckoutOrder] = useState(null);
    const [checkoutDetails, setCheckoutDetails] = useState(null);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [showQR, setShowQR] = useState(false);

    const handleOpenCheckout = async (order) => {
        setCheckoutOrder(order);
        setCheckoutDetails(null);
        setCheckoutLoading(true);
        setShowQR(false);
        try {
            const res = await axios.get(`${BASE_URL}/api/donhang/${order.id_donHang}/detail`);
            setCheckoutDetails(res.data);
        } catch (err) {
            console.error('Lỗi tải chi tiết thanh toán:', err);
            alert('Không thể tải chi tiết đơn hàng.');
            setCheckoutOrder(null);
        } finally {
            setCheckoutLoading(false);
        }
    };

    const handlePrintReceipt = (details) => {
        if (!details) return;

        const finalAmount = details.tongTien - (details.trangThaiCoc === 'Đã cọc' ? details.tienCoc : 0);
        const dateStr = new Date().toLocaleString('vi-VN');

        const printWindow = window.open('', '_blank', 'width=600,height=800');
        if (!printWindow) {
            alert('Vui lòng cho phép trình duyệt hiển thị cửa sổ bật lên (popup) để in hóa đơn.');
            return;
        }

        const itemsHtml = (details.chi_tiet || []).map(item => `
      <tr>
        <td style="padding: 4px 0; font-size: 13px;">${item.tenMon || `Món #${item.id_monAn}`}</td>
        <td style="padding: 4px 0; font-size: 13px; text-align: center;">${item.soLuong}</td>
        <td style="padding: 4px 0; font-size: 13px; text-align: right;">${item.giaTaiThoiDiemBan.toLocaleString('vi-VN')}</td>
        <td style="padding: 4px 0; font-size: 13px; text-align: right; font-weight: bold;">${(item.giaTaiThoiDiemBan * item.soLuong).toLocaleString('vi-VN')}</td>
      </tr>
    `).join('');

        const qrImageSrc = `https://img.vietqr.io/image/970419-9704198526191432198-compact.png?amount=${finalAmount}&addInfo=THANH%20TOAN%20DH${details.id_donHang}&accountName=NGUYEN%20VAN%20A`;

        const htmlContent = `
      <html>
        <head>
          <title>In Hóa Đơn BayFood</title>
          <style>
            @media print {
              body { margin: 0; padding: 10px; width: 80mm; font-family: 'Courier New', Courier, monospace, Arial, sans-serif; color: #000; background: #fff; }
              .no-print { display: none; }
            }
            body { width: 80mm; margin: 0 auto; padding: 20px; font-family: 'Courier New', Courier, monospace, Arial, sans-serif; color: #000; background: #fff; }
            .header { text-align: center; margin-bottom: 15px; }
            .restaurant-name { font-size: 18px; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
            .restaurant-info { font-size: 11px; margin-bottom: 2px; }
            .title { font-size: 15px; font-weight: bold; margin: 10px 0 5px; text-transform: uppercase; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .meta-info { font-size: 12px; margin-bottom: 4px; display: flex; justify-content: space-between; }
            .table-items { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .table-items th { border-bottom: 1px dashed #000; padding: 5px 0; font-size: 12px; text-align: left; }
            .totals-container { margin-top: 10px; font-size: 13px; display: flex; flex-direction: column; gap: 4px; }
            .total-row { display: flex; justify-content: space-between; }
            .qr-container { text-align: center; margin-top: 20px; margin-bottom: 15px; }
            .qr-image { width: 120px; height: 120px; object-fit: contain; }
            .footer { text-align: center; font-size: 11px; margin-top: 20px; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="restaurant-name">BayFood Restaurant</div>
            <div class="restaurant-info">Địa chỉ: Khu đô thị mới, Cầu Giấy, Hà Nội</div>
            <div class="restaurant-info">Điện thoại: 0987.654.321</div>
            <div class="divider"></div>
            <div class="title">Hóa Đơn Thanh Toán</div>
          </div>
          
          <div class="meta-info">
            <span>Mã HĐ: HD-${details.id_donHang}</span>
            <span>Bàn: ${details.id_ban ? `Bàn ${details.id_ban}` : 'Mang về'}</span>
          </div>
          <div class="meta-info">
            <span>Ngày in: ${dateStr}</span>
          </div>
          <div class="meta-info">
            <span>Khách hàng: ${details.tenKhachHang || 'Vãng lai'}</span>
          </div>
          
          <table class="table-items">
            <thead>
              <tr>
                <th style="width: 45%;">Tên món</th>
                <th style="width: 10%; text-align: center;">SL</th>
                <th style="width: 20%; text-align: right;">Đơn giá</th>
                <th style="width: 25%; text-align: right;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="divider"></div>
          
          <div class="totals-container">
            <div class="total-row">
              <span>Tổng tiền món ăn:</span>
              <span>${details.tongTien.toLocaleString('vi-VN')} đ</span>
            </div>
            ${details.tienCoc > 0 && details.trangThaiCoc === 'Đã cọc' ? `
              <div class="total-row" style="color: #000;">
                <span>Đã trừ tiền đặt cọc:</span>
                <span>-${details.tienCoc.toLocaleString('vi-VN')} đ</span>
              </div>
            ` : ''}
            <div class="total-row" style="font-weight: bold; font-size: 15px; border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px;">
              <span>KHÁCH CẦN TRẢ:</span>
              <span>${finalAmount.toLocaleString('vi-VN')} đ</span>
            </div>
          </div>
          
          <div class="qr-container">
            <img class="qr-image" src="${qrImageSrc}" alt="Mã VietQR" />
            <div style="font-size: 9px; margin-top: 4px;">Quét mã để chuyển khoản nhanh</div>
          </div>
          
          <div class="divider"></div>
          
          <div class="footer">
            Cảm ơn Quý khách và Hẹn gặp lại!<br>
            Chúc Quý khách ngon miệng!
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const fetchOrders = useCallback(async () => {
        try {
            const res = await axios.get(`${BASE_URL}/api/donhang/waiter/active`);
            setOrders(res.data);
            setLastRefresh(new Date());
        } catch (err) {
            console.error('Lỗi tải đơn phục vụ:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchShift = useCallback(async () => {
        try {
            const res = await axios.get(`${BASE_URL}/api/donhang/waiter/shift`);
            setShiftData(res.data);
        } catch (err) {
            console.error('Lỗi tải ca:', err);
        }
    }, []);

    const handleShiftCheckIn = async () => {
        setShiftLoading(true);
        try {
            await axios.post(`${BASE_URL}/api/donhang/waiter/shift/checkin`);
            await fetchShift();
        } catch (err) {
            alert(err.response?.data?.detail || 'Không thể vào ca');
        } finally {
            setShiftLoading(false);
        }
    };

    const handleShiftCheckOut = async () => {
        if (!window.confirm('Bạn có chắc muốn tan ca?')) return;
        setShiftLoading(true);
        try {
            await axios.post(`${BASE_URL}/api/donhang/waiter/shift/checkout`);
            await fetchShift();
            // Reload lại lịch sử ca nếu đang ở tab lịch sử ca
            if (activeTab === 'shifts') fetchPersonalShifts();
        } catch (err) {
            alert(err.response?.data?.detail || 'Không thể tan ca');
        } finally {
            setShiftLoading(false);
        }
    };

    const fetchPersonalShifts = useCallback(async () => {
        setPersonalShiftsLoading(true);
        try {
            const res = await axios.get(`${BASE_URL}/api/users/me/shift-history`);
            setPersonalShifts(res.data);
        } catch (err) {
            console.error('Lỗi tải lịch sử ca:', err);
        } finally {
            setPersonalShiftsLoading(false);
        }
    }, []);

    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const res = await axios.get(`${BASE_URL}/api/donhang/waiter/history`);
            setHistoryOrders(res.data);
        } catch (err) {
            console.error('Lỗi tải lịch sử:', err);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && user) { fetchOrders(); fetchShift(); }
    }, [user, authLoading, fetchOrders, fetchShift]);

    useEffect(() => {
        if (!autoRefresh || activeTab !== 'active') return;
        const interval = setInterval(fetchOrders, 20000);
        return () => clearInterval(interval);
    }, [autoRefresh, activeTab, fetchOrders]);

    const updateOrderStatus = async (id_donHang, newStatus) => {
        if (shiftData && shiftData.trangThai !== 'Đang làm') {
            alert('Bạn chưa vào ca làm việc! Vui lòng vào ca trước khi thực hiện thao tác này.');
            return;
        }
        setUpdatingId(id_donHang);
        try {
            await axios.put(`${BASE_URL}/api/donhang/${id_donHang}/status`, { tinhTrang: newStatus });
            await fetchOrders();
        } catch (err) {
            alert(err.response?.data?.detail || 'Không thể cập nhật trạng thái');
        } finally {
            setUpdatingId(null);
        }
    };

    if (authLoading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '42px', height: '42px', border: '4px solid var(--hairline)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
    );

    if (!user) return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <p>Vui lòng đăng nhập để truy cập trang phục vụ</p>
            <button className="btn btn-primary" onClick={() => navigate('/login')}>Đăng nhập</button>
        </div>
    );

    const waitingCount = orders.filter(o => o.tinhTrang === 'Đang chờ món').length;
    const cookingCount = orders.filter(o => o.tinhTrang === 'Đang chế biến').length;
    const readyCount = orders.filter(o => o.tinhTrang === 'Đã phục vụ').length;
    const isShiftOff = shiftData && shiftData.trangThai !== 'Đang làm';

    return (
        <div style={{ minHeight: '100vh', background: 'var(--canvas)' }}>
            {/* Sub-header */}
            <div style={{ background: 'var(--canvas)', borderBottom: '1px solid rgba(94,106,210,0.18)', padding: '0.6rem 2rem', position: 'sticky', top: '60px', zIndex: 40, backdropFilter: 'blur(8px)' }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {/* Ca làm việc */}
                    {shiftData && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {shiftData.trangThai === 'Đang làm' ? (
                                <>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', borderRadius: 'var(--rounded-pill)', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#34d399', fontSize: '0.78rem', fontWeight: '700' }}>
                                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
                                        {shiftData.caLamViec}
                                    </span>
                                    <button onClick={handleShiftCheckOut} disabled={shiftLoading} style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--rounded-pill)', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}>
                                        Tan Ca
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', borderRadius: 'var(--rounded-pill)', background: 'var(--surface-soft)', border: '1px solid var(--hairline)', color: 'var(--muted)', fontSize: '0.78rem', fontWeight: '600' }}>
                                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'inline-block' }} />
                                        Chưa vào ca
                                    </span>
                                    <button onClick={handleShiftCheckIn} disabled={shiftLoading} style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--rounded-pill)', border: '1px solid rgba(16,185,129,0.5)', background: 'rgba(16,185,129,0.15)', color: '#34d399', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}>
                                        Vào Ca
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                    {/* Stats + controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--rounded-pill)', background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.3)', color: '#fbbf24', fontSize: '0.78rem', fontWeight: '700' }}>{waitingCount} chờ món</div>
                        <div style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--rounded-pill)', background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', color: '#fb923c', fontSize: '0.78rem', fontWeight: '700' }}>{cookingCount} đang nấu</div>
                        <div style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--rounded-pill)', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', fontSize: '0.78rem', fontWeight: '700' }}>{readyCount} sẵn sàng</div>
                        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />
                        <button onClick={() => setAutoRefresh(v => !v)} style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--rounded-pill)', border: `1px solid ${autoRefresh ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.12)'}`, background: autoRefresh ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)', color: autoRefresh ? '#34d399' : 'rgba(255,255,255,0.35)', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>
                            {autoRefresh ? '● Auto ON' : '○ Auto OFF'}
                        </button>
                        <button onClick={fetchOrders} style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--rounded-pill)', border: '1px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.12)', color: '#34d399', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>
                            Làm mới · {formatTime(lastRefresh)}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem 2rem' }}>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    {[
                        { key: 'active', label: `Đơn đang phục vụ (${orders.length})` },
                        { key: 'history', label: 'Lịch sử đơn phục vụ' },
                        { key: 'shifts', label: 'Lịch sử ca làm' },
                    ].map(tab => (
                        <button key={tab.key} onClick={() => {
                            setActiveTab(tab.key);
                            if (tab.key === 'history') fetchHistory();
                            if (tab.key === 'shifts') fetchPersonalShifts();
                        }}
                            style={{ padding: '0.55rem 1.4rem', borderRadius: 'var(--rounded-pill)', border: activeTab === tab.key ? 'none' : '1px solid var(--hairline)', background: activeTab === tab.key ? 'var(--primary)' : 'var(--surface-card)', color: activeTab === tab.key ? '#fff' : 'var(--muted)', fontWeight: '700', fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: activeTab === tab.key ? '0 4px 14px rgba(94,106,210,0.3)' : 'none' }}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Active orders tab */}
                {activeTab === 'active' && (
                    <>
                        {isShiftOff && (
                            <div style={{
                                background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.25)',
                                borderRadius: 'var(--rounded-lg)',
                                padding: '1.25rem 1.5rem',
                                marginBottom: '1.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                color: '#f87171',
                                boxShadow: '0 4px 12px rgba(239,68,68,0.05)',
                            }}>
                                <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>⚠️</span>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 0.25rem', color: 'var(--ink)', fontSize: '0.95rem', fontWeight: '700' }}>
                                        Bạn chưa vào ca làm việc!
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted-soft)', fontWeight: '500' }}>
                                        Vui lòng nhấn nút <strong>"Vào Ca"</strong> ở góc trên bên trái để có thể nhận phục vụ và cập nhật trạng thái đơn hàng.
                                    </p>
                                </div>
                            </div>
                        )}

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
                                <div style={{ width: '48px', height: '48px', border: '4px solid var(--hairline)', borderTopColor: '#10b981', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                                Đang tải đơn hàng...
                            </div>
                        ) : orders.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '5rem 2rem', borderRadius: 'var(--rounded-lg)', border: '2px dashed var(--hairline)', background: 'var(--surface-card)' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍽️</div>
                                <h2 style={{ margin: '0 0 0.5rem' }}>Không có đơn nào đang hoạt động</h2>
                                <p style={{ color: 'var(--muted)', margin: 0 }}>Tất cả đơn hàng đã được phục vụ hoặc chưa có đơn mới.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
                                {orders.map(order => {
                                    const elapsed = getElapsedMinutes(order.thoiGianTao);
                                    const isUrgent = elapsed >= 30 && order.tinhTrang !== 'Đã phục vụ';
                                    const isReady = order.tinhTrang === 'Đã phục vụ';
                                    const allDone = order.chi_tiet.every(i => i.trangThaiMon === 'Hoàn thành');
                                    const isExpanded = expandedOrder === order.id_donHang;
                                    const isUpdating = updatingId === order.id_donHang;

                                    return (
                                        <div key={order.id_donHang} style={{
                                            background: 'var(--surface-card)', borderRadius: 'var(--rounded-lg)',
                                            border: isReady ? '1.5px solid rgba(16,185,129,0.5)' : isUrgent ? '1.5px solid rgba(239,68,68,0.5)' : '1px solid var(--hairline)',
                                            boxShadow: 'none',
                                            overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'all 0.25s',
                                        }}>
                                            {/* Card header */}
                                            <div style={{ padding: '1rem 1.25rem', background: isReady ? 'rgba(16,185,129,0.08)' : isUrgent ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                                                        <span style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--ink)' }}>
                                                            {order.id_ban ? `Bàn ${order.id_ban}` : 'Mang về'}
                                                        </span>
                                                        <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>#{order.id_donHang}</span>
                                                        {isUrgent && <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: '700' }}>⚠ Trễ!</span>}
                                                        {order.isMyOrder && (
                                                            <span style={{ padding: '0.15rem 0.5rem', borderRadius: '0.25rem', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', fontSize: '0.68rem', fontWeight: '700' }}>
                                                                Bạn phục vụ
                                                            </span>
                                                        )}
                                                    </div>
                                                    {order.tenKhachHang && (
                                                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Khách: {order.tenKhachHang}</div>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                                                    <StatusBadge status={order.tinhTrang} />
                                                    <span style={{ fontSize: '0.75rem', color: isUrgent ? '#f87171' : 'var(--muted)', fontWeight: isUrgent ? '700' : '400' }}>
                                                        {elapsed} phút
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Items summary + expand toggle */}
                                            <div style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                    {order.chi_tiet.slice(0, 3).map(item => {
                                                        const s = ITEM_STATUS_STYLE[item.trangThaiMon] || { color: 'var(--muted)', bg: 'transparent', border: 'var(--hairline)' };
                                                        return (
                                                            <span key={item.id_chiTietDonHang} style={{ padding: '0.2rem 0.55rem', borderRadius: 'var(--rounded-pill)', background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontSize: '0.72rem', fontWeight: '600' }}>
                                                                {item.tenMon} x{item.soLuong}
                                                            </span>
                                                        );
                                                    })}
                                                    {order.chi_tiet.length > 3 && (
                                                        <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>+{order.chi_tiet.length - 3} món</span>
                                                    )}
                                                </div>
                                                <button onClick={() => setExpandedOrder(isExpanded ? null : order.id_donHang)}
                                                    style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.5rem', borderRadius: '0.5rem', transition: 'all 0.15s' }}>
                                                    {isExpanded ? '▲ Thu gọn' : '▼ Chi tiết'}
                                                </button>
                                            </div>

                                            {/* Expanded items */}
                                            {isExpanded && (
                                                <div style={{ padding: '0 1.25rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    {order.chi_tiet.map(item => {
                                                        const s = ITEM_STATUS_STYLE[item.trangThaiMon] || { color: 'var(--muted)', bg: 'rgba(255,255,255,0.03)', border: 'var(--hairline)' };
                                                        return (
                                                            <div key={item.id_chiTietDonHang} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem', borderRadius: 'var(--rounded-pill)', background: s.bg, border: `1px solid ${s.border}` }}>
                                                                {item.hinhAnh && (
                                                                    <div style={{ width: '36px', height: '36px', borderRadius: '0.4rem', overflow: 'hidden', flexShrink: 0 }}>
                                                                        <img src={`${BASE_URL}${item.hinhAnh}`} alt={item.tenMon} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                                                                    </div>
                                                                )}
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ fontWeight: '600', fontSize: '0.88rem', color: 'var(--ink)' }}>{item.tenMon} <span style={{ color: 'var(--muted)', fontWeight: '400' }}>x{item.soLuong}</span></div>
                                                                    <div style={{ fontSize: '0.73rem', color: s.color, fontWeight: '600', marginTop: '0.1rem' }}>{item.trangThaiMon}</div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Action footer */}
                                            <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--hairline)', background: 'var(--surface-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                                    Gọi lúc {formatTime(order.thoiGianTao)} · {order.chi_tiet.length} món
                                                </span>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    {/* Nút nhận phục vụ nếu đơn chưa gán */}
                                                    {order.isUnassigned && (
                                                        <button onClick={() => updateOrderStatus(order.id_donHang, order.tinhTrang)} disabled={isUpdating || isShiftOff}
                                                            title={isShiftOff ? 'Vui lòng vào ca để nhận đơn' : ''}
                                                            style={{ padding: '0.4rem 1rem', borderRadius: 'var(--rounded-pill)', border: isShiftOff ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(16,185,129,0.4)', background: isShiftOff ? 'rgba(255,255,255,0.04)' : 'rgba(16,185,129,0.15)', color: isShiftOff ? 'rgba(255,255,255,0.25)' : '#34d399', fontWeight: '700', fontSize: '0.78rem', cursor: (isUpdating || isShiftOff) ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                                                            {isUpdating ? '...' : '👋 Nhận phục vụ'}
                                                        </button>
                                                    )}
                                                    {/* Nút phục vụ: chỉ hiện khi Đang chế biến hoặc Đang chờ và allDone */}
                                                    {order.isMyOrder && (order.tinhTrang === 'Đang chế biến' || (order.tinhTrang === 'Đang chờ món' && allDone)) && (
                                                        <button onClick={() => updateOrderStatus(order.id_donHang, 'Đã phục vụ')} disabled={isUpdating || isShiftOff}
                                                            title={isShiftOff ? 'Vui lòng vào ca để phục vụ' : ''}
                                                            style={{ padding: '0.4rem 1rem', borderRadius: 'var(--rounded-pill)', border: 'none', background: isShiftOff ? 'rgba(255,255,255,0.08)' : 'var(--brand-teal)', color: isShiftOff ? 'rgba(255,255,255,0.25)' : '#fff', fontWeight: '700', fontSize: '0.78rem', cursor: (isUpdating || isShiftOff) ? 'not-allowed' : 'pointer', opacity: isUpdating ? 0.6 : 1, boxShadow: isShiftOff ? 'none' : '0 4px 12px rgba(16,185,129,0.3)', transition: 'all 0.2s' }}>
                                                            {isUpdating ? '...' : '✓ Đã phục vụ'}
                                                        </button>
                                                    )}
                                                    {/* Nút thanh toán hoặc hoàn tất trực tiếp nếu đã thanh toán trả trước (0đ) */}
                                                    {(() => {
                                                        const orderTotal = order.chi_tiet.reduce((sum, item) => sum + item.giaTaiThoiDiemBan * item.soLuong, 0);
                                                        const finalBalance = orderTotal - (order.trangThaiCoc === 'Đã cọc' ? order.tienCoc : 0);
                                                        const isPrepaid = finalBalance <= 0;

                                                        if (order.isMyOrder && order.tinhTrang === 'Đã phục vụ') {
                                                            return isPrepaid ? (
                                                                <button onClick={() => {
                                                                    if (window.confirm(`Đơn hàng #${order.id_donHang} này đã được thanh toán online 100% (0đ cần thu). Bạn có muốn hoàn tất đơn và giải phóng bàn ngay không?`)) {
                                                                        updateOrderStatus(order.id_donHang, 'Đã thanh toán');
                                                                    }
                                                                }} disabled={isUpdating || isShiftOff}
                                                                    title={isShiftOff ? 'Vui lòng vào ca để hoàn tất' : ''}
                                                                    style={{ padding: '0.4rem 1rem', borderRadius: 'var(--rounded-pill)', border: 'none', background: isShiftOff ? 'rgba(255,255,255,0.08)' : 'var(--brand-teal)', color: isShiftOff ? 'rgba(255,255,255,0.25)' : '#fff', fontWeight: '700', fontSize: '0.78rem', cursor: (isUpdating || isShiftOff) ? 'not-allowed' : 'pointer', opacity: isUpdating ? 0.6 : 1, boxShadow: isShiftOff ? 'none' : '0 4px 12px rgba(16,185,129,0.3)', transition: 'all 0.2s' }}>
                                                                    {isUpdating ? '...' : '✓ Hoàn tất đơn'}
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => handleOpenCheckout(order)} disabled={isUpdating || isShiftOff}
                                                                    title={isShiftOff ? 'Vui lòng vào ca để thanh toán' : ''}
                                                                    style={{ padding: '0.4rem 1rem', borderRadius: 'var(--rounded-pill)', border: 'none', background: isShiftOff ? 'rgba(255,255,255,0.08)' : 'var(--primary)', color: isShiftOff ? 'rgba(255,255,255,0.25)' : '#fff', fontWeight: '700', fontSize: '0.78rem', cursor: (isUpdating || isShiftOff) ? 'not-allowed' : 'pointer', opacity: isUpdating ? 0.6 : 1, boxShadow: isShiftOff ? 'none' : '0 4px 12px rgba(249,115,22,0.3)', transition: 'all 0.2s' }}>
                                                                    {isUpdating ? '...' : 'Thanh toán'}
                                                                </button>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* History tab */}
                {activeTab === 'history' && (
                    historyLoading ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
                            <div style={{ width: '48px', height: '48px', border: '4px solid var(--hairline)', borderTopColor: '#10b981', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                            Đang tải lịch sử...
                        </div>
                    ) : historyOrders.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '5rem 2rem', borderRadius: 'var(--rounded-lg)', border: '2px dashed var(--hairline)', background: 'var(--surface-card)' }}>
                            <h2 style={{ margin: '0 0 0.5rem' }}>Chưa có lịch sử</h2>
                            <p style={{ color: 'var(--muted)', margin: 0 }}>Chưa có đơn hàng nào hoàn thành.</p>
                        </div>
                    ) : (
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
                                                <div style={{ borderTop: '1px dashed var(--hairline)', paddingTop: '0.75rem', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.82rem', color: 'var(--muted)', fontWeight: 'bold' }}>TỔNG HÓA ĐƠN:</span>
                                                    <strong style={{ fontSize: '1rem', color: '#10b981' }}>{fmtMoney(order.tongTien)}</strong>
                                                </div>
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
                    )
                )}

                {/* Shifts tab */}
                {activeTab === 'shifts' && (
                    personalShiftsLoading ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
                            <div style={{ width: '48px', height: '48px', border: '4px solid var(--hairline)', borderTopColor: '#10b981', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                            Đang tải lịch sử ca làm...
                        </div>
                    ) : personalShifts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '5rem 2rem', borderRadius: 'var(--rounded-lg)', border: '2px dashed var(--hairline)', background: 'var(--surface-card)' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏰</div>
                            <h2 style={{ margin: '0 0 0.5rem' }}>Chưa có lịch sử ca làm</h2>
                            <p style={{ color: 'var(--muted)', margin: 0 }}>Lịch sử check-in và tan ca của bạn sẽ được lưu ở đây.</p>
                        </div>
                    ) : (
                        <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--rounded-lg)', border: '1px solid var(--hairline)', overflow: 'hidden' }}>
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
                                            <tr key={s.id} style={{ borderBottom: '1px solid var(--hairline)', transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.01)' } }}>
                                                <td style={{ padding: '1.1rem 1.5rem', fontWeight: '600', color: 'var(--ink)' }}>{s.ngay}</td>
                                                <td style={{ padding: '1.1rem 1.5rem' }}>
                                                    <span style={{ padding: '0.25rem 0.65rem', borderRadius: '0.5rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399', fontSize: '0.75rem', fontWeight: '700' }}>
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
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: 'var(--rounded-pill)', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#34d399', fontSize: '0.75rem', fontWeight: '700' }}>
                                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
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
                    )
                )}
            </div>

            {/* MODAL THU NGÂN / CHEKOUT CHO PHỤC VỤ */}
            {checkoutOrder && (
                <div onClick={() => setCheckoutOrder(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-card)', borderRadius: 'var(--rounded-lg)', border: '1px solid var(--hairline)', width: '100%', maxWidth: '520px', maxHeight: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column', padding: '1.5rem', boxShadow: '0 25px 60px rgba(0,0,0,0.4)', color: 'var(--ink)' }}>

                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--hairline)', paddingBottom: '0.75rem', flexShrink: 0 }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                Tính tiền &amp; Thu ngân
                            </h2>
                            <button onClick={() => setCheckoutOrder(null)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                &times;
                            </button>
                        </div>

                        {/* Scrollable Content Body */}
                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem', marginBottom: '1rem' }}>
                            {checkoutLoading ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                                    <div style={{ width: '36px', height: '36px', border: '3px solid var(--hairline)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                                    Đang tải chi tiết hóa đơn...
                                </div>
                            ) : checkoutDetails ? (
                                <div>
                                    {/* Table & Customer Summary */}
                                    <div style={{ background: 'var(--surface-soft)', border: '1px solid var(--hairline)', padding: '1rem', borderRadius: 'var(--rounded-lg)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                            <span style={{ color: 'var(--muted)' }}>Bàn ăn:</span>
                                            <strong style={{ color: 'var(--ink)' }}>{checkoutDetails.id_ban ? `Bàn ${checkoutDetails.id_ban}` : 'Mang về'}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                            <span style={{ color: 'var(--muted)' }}>Đơn hàng:</span>
                                            <strong style={{ color: 'var(--ink)' }}>#{checkoutDetails.id_donHang}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--muted)' }}>Khách hàng:</span>
                                            <strong style={{ color: 'var(--ink)' }}>{checkoutDetails.tenKhachHang || 'Vãng lai'}</strong>
                                        </div>
                                    </div>

                                    {/* Ordered Items List */}
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.75rem' }}>Món ăn đã phục vụ</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                        {checkoutDetails.chi_tiet && checkoutDetails.chi_tiet.length > 0 ? (
                                            checkoutDetails.chi_tiet.map((item, idx) => (
                                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-soft)', border: '1px solid var(--hairline)', padding: '0.6rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.85rem' }}>
                                                    <span>{item.tenMon || `Món #${item.id_monAn}`} <strong style={{ color: 'var(--muted)' }}>x{item.soLuong}</strong></span>
                                                    <strong style={{ color: 'var(--ink)' }}>{fmtMoney(item.giaTaiThoiDiemBan * item.soLuong)}</strong>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ color: 'var(--muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>Không có chi tiết món ăn.</div>
                                        )}
                                    </div>

                                    {/* Cost Calculations */}
                                    <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                            <span style={{ color: 'var(--muted)' }}>Tổng tiền món ăn:</span>
                                            <span>{fmtMoney(checkoutDetails.tongTien)}</span>
                                        </div>

                                        {checkoutDetails.tienCoc > 0 && checkoutDetails.trangThaiCoc === 'Đã cọc' && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#10b981' }}>
                                                <span>Khấu trừ tiền cọc bàn:</span>
                                                <strong>-{fmtMoney(checkoutDetails.tienCoc)}</strong>
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--hairline)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                                            <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>CẦN THU CỦA KHÁCH:</span>
                                            <strong style={{ fontSize: '1.3rem', color: 'var(--primary)', textShadow: '0 0 10px rgba(249,115,22,0.2)' }}>
                                                {fmtMoney(checkoutDetails.tongTien - (checkoutDetails.trangThaiCoc === 'Đã cọc' ? checkoutDetails.tienCoc : 0))}
                                            </strong>
                                        </div>
                                    </div>

                                    {/* VietQR Dynamic Code Display */}
                                    {(() => {
                                        const finalAmount = checkoutDetails.tongTien - (checkoutDetails.trangThaiCoc === 'Đã cọc' ? checkoutDetails.tienCoc : 0);
                                        const addInfo = `THANH TOAN DH${checkoutDetails.id_donHang}`;
                                        return (
                                            <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'var(--surface-soft)', border: '1px solid var(--hairline)', borderRadius: 'var(--rounded-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                                <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Quét mã thanh toán VietQR
                                                </span>
                                                <div style={{ background: '#fff', padding: '0.5rem', borderRadius: 'var(--rounded-md)', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '180px', height: '180px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                                    <img
                                                        src={`https://img.vietqr.io/image/970419-9704198526191432198-compact.png?amount=${finalAmount}&addInfo=${encodeURIComponent(addInfo)}&accountName=NGUYEN%20VAN%20A`}
                                                        alt="Mã QR chuyển khoản"
                                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                    />
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', textAlign: 'center', display: 'grid', gap: '0.2rem' }}>
                                                    <span>Chủ tài khoản: <strong style={{ color: 'var(--ink)' }}>NGUYEN VAN A</strong></span>
                                                    <span>Số tài khoản: <strong style={{ color: 'var(--ink)' }}>9704198526191432198</strong></span>
                                                    <span>Ngân hàng: <strong style={{ color: 'var(--ink)' }}>NCB</strong></span>
                                                    <span>Nội dung: <strong style={{ color: 'var(--primary)' }}>{addInfo}</strong></span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <div style={{ color: 'red', textAlign: 'center', padding: '1rem' }}>Lỗi tải chi tiết đơn hàng</div>
                            )}
                        </div>

                        {/* Sticky Modal Footer (Actions) */}
                        {checkoutDetails && (
                            <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--hairline)', flexShrink: 0 }}>
                                <button onClick={() => setCheckoutOrder(null)} className="btn btn-outline" style={{ flex: 1 }}>Hủy</button>
                                <button onClick={() => handlePrintReceipt(checkoutDetails)} className="btn" style={{ flex: 1.5, background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', borderRadius: '0.5rem', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>
                                    🖨️ In hóa đơn
                                </button>
                                <button onClick={async () => {
                                    await updateOrderStatus(checkoutOrder.id_donHang, 'Đã thanh toán');
                                    setCheckoutOrder(null);
                                }} className="btn btn-primary" style={{ flex: 2, background: 'var(--primary)', border: 'none', boxShadow: '0 4px 15px rgba(249,115,22,0.3)', fontWeight: '700' }}>
                                    Đã nhận &amp; Hoàn tất
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
};

export default WaiterPage;
