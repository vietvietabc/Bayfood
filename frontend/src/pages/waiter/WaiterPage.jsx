import React, { useEffect, useState, useCallback } from 'react';
import axios from '../../utils/axiosSetup';
import { useAuth } from '../../context/AuthContext';
import StaffChatPanel from '../../components/StaffChatPanel';
import { MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Sub-components
import {
    BASE_URL, STATUS_FLOW, formatTime, formatDate, getElapsedMinutes, fmtMoney,
    STATUS_STYLE, ITEM_STATUS_STYLE, StatusBadge
} from './components/WaiterConstants';
import WaiterCheckout from './components/WaiterCheckout';
import HistoryView from './components/WaiterTabs/HistoryView';
import ShiftsView from './components/WaiterTabs/ShiftsView';
import UpcomingView from './components/WaiterTabs/UpcomingView';
import TablesView from './components/WaiterTabs/TablesView';
import ScheduleView from './components/WaiterTabs/ScheduleView';

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
    const [showChatPanel, setShowChatPanel] = useState(false);

    // Upcoming orders state
    const [upcomingOrders, setUpcomingOrders] = useState([]);
    const [upcomingLoading, setUpcomingLoading] = useState(false);

    // Tables state
    const [tables, setTables] = useState([]);
    const [tablesLoading, setTablesLoading] = useState(false);

    // Schedule/Timeline state
    const [timeline, setTimeline] = useState([]);
    const [timelineLoading, setTimelineLoading] = useState(false);
    const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);

    // Checkout/Cashier modal state
    const [checkoutOrder, setCheckoutOrder] = useState(null);
    const [checkoutDetails, setCheckoutDetails] = useState(null);
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    const handleOpenCheckout = async (order) => {
        setCheckoutOrder(order);
        setCheckoutDetails(null);
        setCheckoutLoading(true);
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

        const finalAmount = Math.max(0, details.tongTien - Math.max(details.trangThaiCoc === 'Đã cọc' ? details.tienCoc : 0, details.tongThanhToan || 0));
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
            ${details.trangThaiCoc === 'Đã cọc' && details.tienCoc > 0 ? `
              <div class="total-row" style="color: #000;">
                <span>Tiền cọc (Đã thanh toán):</span>
                <span>-${details.tienCoc.toLocaleString('vi-VN')} đ</span>
              </div>
            ` : ''}
            ${(details.tongThanhToan || 0) > (details.trangThaiCoc === 'Đã cọc' ? details.tienCoc : 0) ? `
              <div class="total-row" style="color: #000;">
                <span>Đã thanh toán bổ sung:</span>
                <span>-${(details.tongThanhToan - (details.trangThaiCoc === 'Đã cọc' ? details.tienCoc : 0)).toLocaleString('vi-VN')} đ</span>
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

    const fetchUpcoming = useCallback(async () => {
        setUpcomingLoading(true);
        try {
            const res = await axios.get(`${BASE_URL}/api/donhang/waiter/upcoming`);
            setUpcomingOrders(res.data);
        } catch (err) {
            console.error('Lỗi tải đơn sắp tới:', err);
        } finally {
            setUpcomingLoading(false);
        }
    }, []);

    const fetchTables = useCallback(async () => {
        setTablesLoading(true);
        try {
            const res = await axios.get(`${BASE_URL}/api/ban/`);
            setTables(res.data);
        } catch (err) {
            console.error('Lỗi tải danh sách bàn:', err);
        } finally {
            setTablesLoading(false);
        }
    }, []);

    const fetchTimeline = useCallback(async (date) => {
        setTimelineLoading(true);
        try {
            const res = await axios.get(`${BASE_URL}/api/datban/timeline?ngay=${date}`);
            const now = new Date();
            const formattedTables = (res.data.tables || []).map(t => {
                return {
                    id_ban: t.table.id_ban,
                    tenBan: t.table.tenBan,
                    sucChua: t.table.sucChua,
                    slots: t.slots.map(s => {
                        const dateObj = new Date(s.batDau);
                        const slotEndObj = new Date(s.ketThuc || (dateObj.getTime() + 60 * 60 * 1000));
                        const timeStr = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

                        // Slot quá khứ: giờ kết thúc đã trôi qua
                        const isPast = slotEndObj <= now;

                        let statusStr = 'available';
                        if (isPast) {
                            // Slot đã qua: nếu có đặt bàn thì hiển thị "past-booked", ngược lại "past"
                            statusStr = s.id_datBan ? 'past-booked' : 'past';
                        } else if (s.trangThai === 'Trống') {
                            statusStr = 'available';
                        } else if (s.trangThai === 'Đã đặt' || s.trangThai === 'Chờ xác nhận') {
                            statusStr = 'warning';
                        } else {
                            statusStr = 'occupied';
                        }

                        let khachName = null;
                        let reservationStatus = null;
                        if (s.id_datBan) {
                            khachName = `Đơn #${s.id_datBan}`;
                            // trangThai được trả về từ backend nếu có
                            reservationStatus = s.trangThai || null;
                        }

                        return {
                            time: timeStr,
                            status: statusStr,
                            khach: khachName,
                            soNguoi: null,
                            reservationStatus,
                        };
                    })
                };
            });
            setTimeline(formattedTables);
        } catch (err) {
            console.error('Lỗi tải lịch trình bàn:', err);
        } finally {
            setTimelineLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && user) { fetchOrders(); fetchShift(); }
    }, [user, authLoading, fetchOrders, fetchShift]);

    useEffect(() => {
        if (!autoRefresh || (activeTab !== 'active' && activeTab !== 'upcoming')) return;
        const fn = activeTab === 'active' ? fetchOrders : fetchUpcoming;
        const interval = setInterval(fn, 20000);
        return () => clearInterval(interval);
    }, [autoRefresh, activeTab, fetchOrders, fetchUpcoming]);

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
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--canvas)' }}>
            {/* Main content */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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
                        <button
                            onClick={() => setShowChatPanel(!showChatPanel)}
                            title="Chat với khách hàng"
                            style={{
                                padding: '0.3rem 0.75rem', borderRadius: 'var(--rounded-pill)',
                                border: `1px solid ${showChatPanel ? 'rgba(16,185,129,0.4)' : 'var(--hairline)'}`,
                                background: showChatPanel ? 'rgba(16,185,129,0.1)' : 'var(--surface-soft)',
                                color: showChatPanel ? '#34d399' : 'var(--muted)',
                                fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '0.3rem',
                            }}
                        >
                            <MessageSquare size={14} /> Chat
                        </button>
                        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />
                        <button onClick={() => setAutoRefresh(v => !v)} style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--rounded-pill)', border: `1px solid ${autoRefresh ? 'rgba(52,211,153,0.4)' : 'var(--hairline)'}`, background: autoRefresh ? 'rgba(52,211,153,0.1)' : 'var(--surface-soft)', color: autoRefresh ? '#34d399' : 'var(--muted)', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>
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
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    {[
                        { key: 'active', label: `Đơn đang phục vụ (${orders.length})` },
                        { key: 'upcoming', label: `Đơn sắp tới (${upcomingOrders.length})` },
                        { key: 'tables', label: 'Sơ đồ bàn' },
                        { key: 'schedule', label: 'Lịch trình' },
                        { key: 'history', label: 'Lịch sử đơn phục vụ' },
                        { key: 'shifts', label: 'Lịch sử ca làm' },
                    ].map(tab => (
                        <button key={tab.key} onClick={() => {
                            setActiveTab(tab.key);
                            if (tab.key === 'history') fetchHistory();
                            if (tab.key === 'shifts') fetchPersonalShifts();
                            if (tab.key === 'upcoming') fetchUpcoming();
                            if (tab.key === 'tables') fetchTables();
                            if (tab.key === 'schedule') fetchTimeline(scheduleDate);
                        }}
                            style={{
                                padding: '0.6rem 1.5rem',
                                borderRadius: 'var(--rounded-pill)',
                                border: activeTab === tab.key ? 'none' : '1px solid var(--hairline)',
                                background: activeTab === tab.key ? 'var(--primary)' : 'var(--surface-card)',
                                color: activeTab === tab.key ? '#fff' : 'var(--muted)',
                                fontWeight: '700',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: activeTab === tab.key ? '0 4px 14px rgba(249,115,22,0.3)' : 'none'
                            }}>
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

                                            {/* Payment summary khi expand */}
                                            {isExpanded && (() => {
                                                const orderTotal = order.chi_tiet.reduce((sum, item) => sum + (item.giaTaiThoiDiemBan || 0) * (item.soLuong || 0), 0);
                                                const daCoc = order.trangThaiCoc === 'Đã cọc' ? (order.tienCoc || 0) : 0;
                                                const daThanhToan = Math.max(daCoc, order.tongThanhToan || 0);
                                                const tienThua = Math.max(0, daThanhToan - orderTotal);
                                                const conLai = Math.max(0, orderTotal - daThanhToan);
                                                return (
                                                    <div style={{ margin: '0 1.25rem 0.75rem', borderTop: '1px dashed var(--hairline)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                                            <span style={{ color: 'var(--muted)', fontWeight: 'bold' }}>Tổng hóa đơn:</span>
                                                            <strong style={{ color: 'var(--ink)' }}>{fmtMoney(orderTotal)}</strong>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                                            <span style={{ color: 'var(--muted)' }}>Khách đã trả{daCoc > 0 ? ' (gồm cọc)' : ''}:</span>
                                                            <strong style={{ color: '#34d399' }}>{fmtMoney(daThanhToan)}</strong>
                                                        </div>
                                                        {tienThua > 0 && (
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderRadius: '0.6rem', background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)' }}>
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
                                                            {isUpdating ? '...' : ' Đã phục vụ'}
                                                        </button>
                                                    )}
                                                    {/* Nút thanh toán hoặc hoàn tất trực tiếp nếu đã thanh toán trả trước (0đ) */}
                                                    {(() => {
                                                        const orderTotal = order.chi_tiet.reduce((sum, item) => sum + item.giaTaiThoiDiemBan * item.soLuong, 0);
                                                        const finalBalance = orderTotal - Math.max(order.trangThaiCoc === 'Đã cọc' ? order.tienCoc : 0, order.tongThanhToan || 0);
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
                                                                    {isUpdating ? '...' : ' Hoàn tất đơn'}
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
                    <HistoryView
                        historyOrders={historyOrders}
                        historyLoading={historyLoading}
                        expandedOrder={expandedOrder}
                        setExpandedOrder={setExpandedOrder}
                    />
                )}

                {/* Shifts tab */}
                {activeTab === 'shifts' && (
                    <ShiftsView
                        personalShifts={personalShifts}
                        personalShiftsLoading={personalShiftsLoading}
                    />
                )}

                {/* Upcoming orders tab */}
                {activeTab === 'upcoming' && (
                    <UpcomingView
                        upcomingOrders={upcomingOrders}
                        upcomingLoading={upcomingLoading}
                    />
                )}

                {/* Tables tab */}
                {activeTab === 'tables' && (
                    <TablesView
                        tables={tables}
                        tablesLoading={tablesLoading}
                    />
                )}

                {/* Schedule tab */}
                {activeTab === 'schedule' && (
                    <ScheduleView
                        timeline={timeline}
                        timelineLoading={timelineLoading}
                        scheduleDate={scheduleDate}
                        setScheduleDate={setScheduleDate}
                        fetchTimeline={fetchTimeline}
                    />
                )}
            </div>


            {/* MODAL THU NGÂN / CHECKOUT CHO PHỤC VỤ */}
            <WaiterCheckout
                checkoutOrder={checkoutOrder}
                checkoutDetails={checkoutDetails}
                checkoutLoading={checkoutLoading}
                onClose={() => setCheckoutOrder(null)}
                onPrintReceipt={handlePrintReceipt}
                onComplete={async (id_donHang) => {
                    await updateOrderStatus(id_donHang, 'Đã thanh toán');
                    setCheckoutOrder(null);
                }}
            />
            </div> {/* End main content */}

            {/* Chat Panel (slide từ phải) */}
            <div style={{
                width: showChatPanel ? '360px' : '0',
                flexShrink: 0,
                overflow: 'hidden',
                transition: 'width 0.3s ease',
                borderLeft: showChatPanel ? '1px solid var(--border)' : 'none',
            }}>
                {showChatPanel && <StaffChatPanel />}
            </div>
        </div>
    );
};

export default WaiterPage;