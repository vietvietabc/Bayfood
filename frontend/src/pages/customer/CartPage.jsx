import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowRight, ShoppingCart, Calendar, Clock, Users, Edit3 } from 'lucide-react';
import axios from '../../utils/axiosSetup';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

import { 
    toLocalDateString, toMinutes, buildDateRange, formatTimelineTime,
    isBookedSlot, isBlockedSlot, isWarningSlot 
} from './cart/cartUtils';
import CartItem from './cart/CartItem';
import CartPaymentChoice from './cart/CartPaymentChoice';
import CartTimelineModal from './cart/CartTimelineModal';
import CartCustomAlert from './cart/CartCustomAlert';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const todayString = toLocalDateString(new Date());

const CartPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { cart, updateQuantity, removeFromCart, cartTotal, clearCart, selectedTableId, editingOrderId, setEditingOrderId, setCartFromOrder } = useCart();

    // Đã xóa logic unmount clear cart để giữ state khi sang trang menu.
    // Khách hàng có thể chủ động bấm "Hủy chỉnh sửa" nếu muốn thoát chế độ edit.

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(null);
    const [showPaymentChoice, setShowPaymentChoice] = useState(false);
    const [pendingPayload, setPendingPayload] = useState(null);
    const [payingMode, setPayingMode] = useState(null);
    const [hasPendingBooking, setHasPendingBooking] = useState(false); // Có đặt bàn kèm từ trang đặt bàn
    const [editingPendingBooking, setEditingPendingBooking] = useState(false); // Đang chỉnh sửa booking
    // Mini timeline trong edit booking
    const [editTimeline, setEditTimeline] = useState([]);          // slots của bàn cho ngày đã chọn
    const [editTimelineLoading, setEditTimelineLoading] = useState(false);
    const [editSoNguoiError, setEditSoNguoiError] = useState('');   // lỗi validate số người
    const [editTimeError, setEditTimeError] = useState('');         // lỗi validate giờ nhập tay

    // Booking Form State
    const [bookingForm, setBookingForm] = useState({
        id_ban: '',
        date: todayString,
        time: '',
        soNguoi: 2,
        ghiChu: ''
    });

    const nextWeekString = toLocalDateString(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    // Timeline State
    const [timelineSearch, setTimelineSearch] = useState({
        fromDate: todayString,
        toDate: todayString,
        fromTime: '07:00',
    });
    const [orderDate, setOrderDate] = useState(todayString);
    const [orderTime, setOrderTime] = useState('');
    const [timelineDays, setTimelineDays] = useState([]);
    const [timelineLoading, setTimelineLoading] = useState(false);
    const [tables, setTables] = useState([]);
    const [loadingTables, setLoadingTables] = useState(true);
    const [selectedTableLocal, setSelectedTableLocal] = useState(null);
    const [selectedSlotKey, setSelectedSlotKey] = useState('');
    const [selectedTableFilter, setSelectedTableFilter] = useState(null);
    const [upcomingReservation, setUpcomingReservation] = useState(null);
    const [isEditingTime, setIsEditingTime] = useState(false);
    const [customAlert, setCustomAlert] = useState({ show: false, message: '', type: 'info', onClose: null, showCancel: false });


    const showAlert = (message, type = 'info', onClose = null, showCancel = false) => {
        setCustomAlert({ show: true, message, type, onClose, showCancel });
    };

    useEffect(() => {
        if (selectedTableId) return;
        const loadTables = async () => {
            try {
                setLoadingTables(true);
                const response = await axios.get(`${BASE_URL}/api/ban`);
                setTables(response.data || []);
            } catch (error) {
                console.error('Failed to load tables', error);
                setTables([]);
            } finally {
                setLoadingTables(false);
            }
        };
        loadTables();
    }, [selectedTableId]);

    useEffect(() => {
        if (user && !selectedTableId && !editingOrderId) {
            const fetchUpcomingReservation = async () => {
                try {
                    const res = await axios.get(`${BASE_URL}/api/datban/me`);
                    const activeRes = res.data.find(r =>
                        ['Chờ xác nhận', 'Đã đặt', 'Đã xác nhận'].includes(r.trangThai) &&
                        new Date(r.thoiGianDen) > new Date()
                    );
                    if (activeRes) {
                        setUpcomingReservation(activeRes);
                        const resDate = new Date(activeRes.thoiGianDen);
                        setOrderDate(toLocalDateString(resDate));
                        setOrderTime(resDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }));
                    }
                } catch (e) {
                    console.error("Failed to load upcoming reservation", e);
                }
            };
            fetchUpcomingReservation();
        }
    }, [user, selectedTableId, editingOrderId]);

    // Đọc pendingReservation từ sessionStorage (set bởi ReservationPage khi khách chọn "Đặt món ngay")
    useEffect(() => {
        const raw = sessionStorage.getItem('pendingReservation');
        if (!raw) return;
        try {
            const reservation = JSON.parse(raw);
            sessionStorage.removeItem('pendingReservation');
            const dt = new Date(reservation.thoiGianDen);
            const dateStr = toLocalDateString(dt);
            const timeStr = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
            setBookingForm({
                id_ban: reservation.id_ban || '',
                date: dateStr,
                time: timeStr,
                soNguoi: reservation.soNguoi || 2,
                ghiChu: reservation.ghiChu || ''
            });
            setOrderDate(dateStr);
            setOrderTime(timeStr);
            setSelectedTableFilter(reservation.id_ban || null);
            setTimelineSearch(prev => ({ ...prev, fromDate: dateStr, fromTime: timeStr }));
            setHasPendingBooking(true); // Đánh dấu có booking kèm — KHÔNG mở modal cũ
        } catch (e) {
            console.error('Failed to parse pendingReservation', e);
        }
    }, []);

    // Đọc pendingEditOrder từ sessionStorage (set bởi handleEditOrder khi khách bấm Chỉnh sửa)
    useEffect(() => {
        const raw = sessionStorage.getItem('pendingEditOrder');
        if (!raw) return;
        try {
            const { orderId, items, thoiGianDen } = JSON.parse(raw);
            sessionStorage.removeItem('pendingEditOrder');
            if (orderId && items && items.length > 0) {
                setCartFromOrder(items, orderId, thoiGianDen);
            }
        } catch (e) {
            console.error('Failed to parse pendingEditOrder', e);
        }
    }, []);

    // Load mini timeline khi đang chỉnh sửa booking và ngày / bàn thay đổi
    useEffect(() => {
        if (!editingPendingBooking || !bookingForm.date || !bookingForm.id_ban) return;
        const loadEditTimeline = async () => {
            setEditTimelineLoading(true);
            setEditTimeline([]);
            try {
                const timelineRes = await axios.get(`${BASE_URL}/api/datban/timeline`, {
                    params: { ngay: bookingForm.date, fromTime: '00:00' }
                });
                const raw = timelineRes.data;
                const tablesList = raw?.tables || [];
                const tableEntry = tablesList.find(e => Number(e?.table?.id_ban) === Number(bookingForm.id_ban));
                console.log('[EditTimeline] id_ban:', bookingForm.id_ban, 'tables:', tablesList.length, 'found:', !!tableEntry, 'slots:', tableEntry?.slots?.length);
                setEditTimeline(tableEntry?.slots || []);
            } catch (e) {
                console.error('Failed to load edit timeline', e);
                setEditTimeline([]);
            } finally {
                setEditTimelineLoading(false);
            }
        };
        loadEditTimeline();
    }, [editingPendingBooking, bookingForm.date, bookingForm.id_ban]);

    useEffect(() => {
        if (selectedTableId || !showModal) return;
        const loadTimeline = async () => {
            const dates = buildDateRange(timelineSearch.fromDate, timelineSearch.toDate);
            if (dates.length === 0) {
                setTimelineDays([]);
                return;
            }
            setTimelineLoading(true);
            try {
                const results = await Promise.all(
                    dates.map(async (date) => {
                        const response = await axios.get(`${BASE_URL}/api/datban/timeline`, {
                            params: { ngay: date, fromTime: timelineSearch.fromTime }
                        });
                        return response.data || { ngay: date, workingHours: null, tables: [] };
                    })
                );
                setTimelineDays(results);
            } catch (error) {
                console.error('Failed to load range timeline', error);
                setTimelineDays([]);
            } finally {
                setTimelineLoading(false);
            }
        };
        loadTimeline();
    }, [timelineSearch.fromDate, timelineSearch.toDate, timelineSearch.fromTime, selectedTableId, showModal]);

    const handleTimelineRangeChange = (e) => {
        const { name, value } = e.target;
        if (name === 'fromDate') {
            setTimelineSearch((current) => ({
                ...current,
                fromDate: value,
                toDate: current.toDate < value ? value : current.toDate,
            }));
            setBookingForm(prev => ({ ...prev, date: value }));
            return;
        }
        setTimelineSearch(prev => ({ ...prev, [name]: value }));
    };

    const isSlotWithinSearchRange = (slotStart) => {
        const startMinutes = toMinutes(timelineSearch.fromTime);
        const slotStartMinutes = slotStart.getHours() * 60 + slotStart.getMinutes();
        if (startMinutes == null) return true;
        return slotStartMinutes >= startMinutes;
    };

    // Ngưỡng tối thiểu đơn hàng để được đặt bàn (không áp dụng cho QR tại bàn)
    const MIN_ORDER_FOR_TABLE = 100_000;

    const handleCheckoutClick = async () => {
        if (cart.length === 0) return;

        if (!user) {
            showAlert('Vui lòng đăng nhập trước khi đặt món.', 'error', () => {
                navigate('/login');
            });
            return;
        }

        if (editingOrderId) {
            submitOrderEdit();
            return;
        }

        // Nếu có pending booking từ trang đặt bàn: validate trước rồi gọi submitOrder(true)
        if (hasPendingBooking) {
            // Kiểm tra ngưỡng tối thiểu cho đặt bàn
            if (cartTotal < MIN_ORDER_FOR_TABLE) {
                showAlert(
                    `Giá trị đơn hàng tối thiểu để đặt bàn là ${MIN_ORDER_FOR_TABLE.toLocaleString('vi-VN')} ₫.\nVui lòng thêm món để tiếp tục đặt bàn.`,
                    'warning'
                );
                return;
            }
            if (!bookingForm.time) {
                showAlert('Vui lòng chọn giờ đến trước khi xác nhận.', 'error');
                setEditingPendingBooking(true);
                return;
            }
            // Re-validate ngay lúc submit (tránh stale state)
            const chosenDT = new Date(`${bookingForm.date}T${bookingForm.time}:00`);
            if (chosenDT <= new Date()) {
                showAlert('Giờ đặt đã qua, vui lòng chọn giờ khác.', 'error');
                setEditingPendingBooking(true);
                return;
            }
            const conflict = editTimeline.find(slot => {
                if (slot.trangThai !== 'Đã có người đặt' && slot.trangThai !== 'Không đủ thời gian') return false;
                const s = new Date(slot.batDau);
                const end = slot.ketThuc ? new Date(slot.ketThuc) : new Date(s.getTime() + 60 * 60 * 1000);
                return chosenDT >= s && chosenDT < end;
            });
            if (conflict) {
                showAlert('Khung giờ này đã có người đặt, vui lòng chọn giờ khác.', 'error');
                setEditingPendingBooking(true);
                return;
            }
            submitOrder(true);
            return;
        }

        if (!selectedTableId && (!orderDate || !orderTime)) {
            showAlert('Vui lòng chọn ngày và giờ dự kiến bạn sẽ tới ăn hoặc lấy món.', 'error');
            return;
        }

        if (selectedTableId || (upcomingReservation && !isEditingTime)) {
            // selectedTableId có thể là QR → không chặn. Chỉ chặn khi là đặt bàn thường (upcomingReservation)
            if (!selectedTableId && upcomingReservation && !isEditingTime && cartTotal < MIN_ORDER_FOR_TABLE) {
                showAlert(
                    `Giá trị đơn hàng tối thiểu để đặt bàn là ${MIN_ORDER_FOR_TABLE.toLocaleString('vi-VN')} ₫.\nVui lòng thêm món để tiếp tục.`,
                    'warning'
                );
                return;
            }
            submitOrder(false);
        } else {
            // Kiểm tra ngưỡng trước khi mở modal chọn bàn
            if (cartTotal < MIN_ORDER_FOR_TABLE) {
                showAlert(
                    `Giá trị đơn hàng tối thiểu để đặt bàn là ${MIN_ORDER_FOR_TABLE.toLocaleString('vi-VN')} ₫.\nVui lòng thêm món để tiếp tục đặt bàn.`,
                    'warning'
                );
                return;
            }
            // Tính ngày hiển thị: nếu hôm nay đã qua 20:00, tự nhảy sang ngày mai
            const now = new Date();
            const isToday = (orderDate || todayString) === todayString;
            const targetDate = (isToday && now.getHours() >= 20)
                ? toLocalDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
                : (orderDate || todayString);
            // Chỉ load 1 ngày để tránh quá nhiều request
            setTimelineSearch(prev => ({
                ...prev,
                fromDate: targetDate,
                toDate: targetDate,
                fromTime: '07:00',
            }));
            setShowModal(true);
        }

    };

    const submitOrderEdit = async () => {
        setIsSubmitting(true);
        try {
            const chi_tiet = cart.map(item => ({
                id_monAn: item.id_monAn,
                soLuong: item.quantity,
                giaTaiThoiDiemBan: item.giaTien
            }));

            const res = await axios.post(
                `${BASE_URL}/api/donhang/me/${editingOrderId}/initiate-edit`,
                { chi_tiet }
            );

            if (res.data.status === 'updated') {
                clearCart();
                setEditingOrderId(null);
                const { so_du, total_paid, new_total } = res.data;
                if (so_du && so_du > 0) {
                    // Khách đã trả dư — thông báo nhà hàng sẽ hoàn khi đến
                    const soDuStr = Number(so_du).toLocaleString('vi-VN');
                    const totalPaidStr = Number(total_paid).toLocaleString('vi-VN');
                    const newTotalStr = Number(new_total).toLocaleString('vi-VN');
                    showAlert(
                        `Đơn hàng đã được cập nhật.\n\nBạn đã thanh toán trước ${totalPaidStr} ₫, tổng món mới chỉ còn ${newTotalStr} ₫.\n\n Nhà hàng sẽ hoàn lại ${soDuStr} ₫ cho bạn khi đến.`,
                        'success',
                        () => { navigate('/account'); }
                    );
                } else {
                    showAlert('Cập nhật đơn hàng thành công!', 'success', () => {
                        navigate('/account');
                    });
                }
            } else if (res.data.status === 'payment_required') {
                const { so_tien_them, old_total, new_total, diff, hinhThucThanhToan, paymentUrl } = res.data;
                const soTienThemStr = Number(so_tien_them).toLocaleString('vi-VN');
                const diffStr = Number(diff || (new_total - old_total)).toLocaleString('vi-VN');
                const oldStr = Number(old_total).toLocaleString('vi-VN');
                const newStr = Number(new_total).toLocaleString('vi-VN');
                const modeNote = hinhThucThanhToan === 'đặt cọc'
                    ? `(10% cọc của phần tăng thêm ${diffStr} ₫)`
                    : `(toàn bộ phần tăng thêm)`;

                showAlert(
                    `Tổng đơn tăng từ ${oldStr} ₫ → ${newStr} ₫.\n\nBạn cần thanh toán thêm: ${soTienThemStr} ₫ ${modeNote}\n\nNhấn Đồng ý để chuyển đến trang thanh toán VNPay.`,
                    'warning',
                    () => {
                        clearCart();
                        setEditingOrderId(null);
                        window.location.href = paymentUrl;
                    },
                    true // Bật nút Hủy (showCancel)
                );
            }
        } catch (error) {
            console.error('Lỗi khi cập nhật đơn hàng:', error);
            showAlert(error.response?.data?.detail || 'Có lỗi xảy ra khi cập nhật đơn hàng.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelEdit = () => {
        clearCart();
        setEditingOrderId(null);
        navigate('/account');
    };

    /**
     * submitOrder: Chuẩn bị payload và hiển thị màn hình chọn thanh toán.
     * CHƯA gọi API nào. Chỉ sau khi user nhấn nút mới gọi initiatePayment.
     */
    const submitOrder = async (isBookingTable) => {
        const payload = {
            cart: cart.map(item => ({
                id_monAn: item.id_monAn,
                soLuong: item.quantity,
                giaTaiThoiDiemBan: item.giaTien,
            })),
            id_ban: selectedTableId ? parseInt(selectedTableId) : null,
            id_datBan: (!selectedTableId && !isBookingTable && upcomingReservation && !isEditingTime)
                ? upcomingReservation.id_datBan : null,
            thoiGianDen: null,
            dat_ban: null,
        };

        if (!selectedTableId && !isBookingTable && orderDate && orderTime) {
            payload.thoiGianDen = `${orderDate}T${orderTime}:00`;
        }

        if (isBookingTable) {
            const thoiGianDen = `${bookingForm.date}T${bookingForm.time}:00`;
            payload.thoiGianDen = thoiGianDen;
            payload.dat_ban = {
                id_ban: bookingForm.id_ban ? parseInt(bookingForm.id_ban) : null,
                thoiGianDen: thoiGianDen,
                soNguoi: parseInt(bookingForm.soNguoi),
                ghiChu: bookingForm.ghiChu,
            };
        }

        // NẾU KHÁCH QUÉT QR TẠI BÀN (có selectedTableId và KHÔNG CÓ thoiGianDen/dat_ban)
        if (selectedTableId && !payload.thoiGianDen && !payload.dat_ban) {
            try {
                setIsSubmitting(true);
                const qrToken = sessionStorage.getItem('qrToken');
                const qrPayload = {
                    chi_tiet: payload.cart.map(item => ({
                        id_monAn: item.id_monAn,
                        soLuong: item.soLuong,
                        giaTaiThoiDiemBan: item.giaTaiThoiDiemBan
                    })),
                    token: qrToken || null
                };
                const res = await axios.post(`${BASE_URL}/api/donhang/table/${selectedTableId}/qr-order`, qrPayload);

                clearCart();
                showAlert(`Gọi món thành công! Bếp đang chuẩn bị các món ăn cho bàn của bạn.`, 'success', () => {
                    navigate('/account');
                });
                return;
            } catch (err) {
                console.error("Lỗi QR Order:", err);
                showAlert(err.response?.data?.detail || "Có lỗi xảy ra khi gọi món tại bàn.", 'error');
                return;
            } finally {
                setIsSubmitting(false);
            }
        }

        const hasReservation = isBookingTable
            || (!!upcomingReservation && !isEditingTime)
            || !!payload.thoiGianDen;

        setPendingPayload({ ...payload, hasReservation, isBookingTable });
        setShowModal(false);
        if (editingOrderId) {
            submitOrderEdit();
        } else {
            setShowPaymentChoice(true);
        }
    };


    /** Gọi API initiate-booking → redirect VNPay. */
    const initiatePayment = async (mode) => {
        if (!pendingPayload) return;
        setIsSubmitting(true);
        setPayingMode(mode);
        try {
            const body = {
                cart: pendingPayload.cart,
                dat_ban: pendingPayload.dat_ban || null,
                payment_mode: mode,
                id_ban: pendingPayload.id_ban || null,
                id_datBan: pendingPayload.id_datBan || null,
                thoiGianDen: pendingPayload.thoiGianDen || null,
            };
            const res = await axios.post(`${BASE_URL}/api/payment/initiate-booking`, body);
            clearCart();
            window.location.href = res.data.paymentUrl;
        } catch (err) {
            showAlert(err.response?.data?.detail || 'Không thể khởi tạo thanh toán. Vui lòng thử lại.', 'error');
        } finally {
            setIsSubmitting(false);
            setPayingMode(null);
        }
    };


    return (
        <div className="container py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Giỏ Hàng</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Kiểm tra món ăn, chỉnh số lượng và tiến hành đặt món.</p>
                </div>
                <Link to="/menu" className="btn btn-outline" style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                    <ShoppingBag size={18} /> Tiếp tục chọn món
                </Link>
            </div>

            {/* ===== MÀN HÌNH CHỌN THANH TOÁN (trước khi tạo đơn) ===== */}
            {showPaymentChoice && pendingPayload && (
                <CartPaymentChoice
                    pendingPayload={pendingPayload}
                    tables={tables}
                    isSubmitting={isSubmitting}
                    payingMode={payingMode}
                    initiatePayment={initiatePayment}
                    onBack={() => { setShowPaymentChoice(false); setPendingPayload(null); }}
                />
            )}

            {!showPaymentChoice && cart.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <ShoppingCart size={56} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.6 }} />
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Giỏ hàng đang trống</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Thêm món từ thực đơn để tạo đơn hàng mới.</p>
                    <Link to="/menu" className="btn btn-primary" style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                        Xem thực đơn <ArrowRight size={18} />
                    </Link>
                </div>
            ) : !showPaymentChoice && (
                <div className="grid grid-cols-2 gap-8" style={{ alignItems: 'start' }}>
                    <div className="card" style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Món đã chọn</h2>
                        </div>
                        <div style={{ padding: '1rem' }}>
                            {cart.map((item) => (
                                <CartItem key={item.id_monAn} item={item} updateQuantity={updateQuantity} removeFromCart={removeFromCart} />
                            ))}
                        </div>
                    </div>

                    <div className="card" style={{ padding: '1.5rem', position: 'sticky', top: '1.5rem' }}>
                        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Tóm tắt đơn hàng</h2>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
                            <span>Số lượng món</span>
                            <strong style={{ color: 'var(--text-main)' }}>{cart.reduce((count, item) => count + item.quantity, 0)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
                            <span>Tạm tính</span>
                            <strong style={{ color: 'var(--text-main)' }}>{cartTotal.toLocaleString('vi-VN')} đ</strong>
                        </div>
                        {!editingOrderId && (
                            <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(249, 115, 22, 0.08)', marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
                                {selectedTableId ? `Đơn này sẽ được gắn trực tiếp vào bàn #${selectedTableId} bạn đang ngồi.` : hasPendingBooking ? '' : 'Bạn có thể chọn đặt bàn giữ chỗ trước, hoặc đặt mang về tuỳ thích.'}
                            </div>
                        )}

                        {/* Cảnh báo ngưỡng tối thiểu đặt bàn (ẩn khi QR hoặc không có booking) */}
                        {!editingOrderId && !selectedTableId && hasPendingBooking && cartTotal < MIN_ORDER_FOR_TABLE && (
                            <div style={{
                                padding: '0.85rem 1rem', borderRadius: '0.75rem',
                                background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.3)',
                                marginBottom: '1.5rem', fontSize: '0.82rem', color: '#b91c1c', lineHeight: 1.6
                            }}>
                                ⚠️ <strong>Cần thêm món để đặt bàn.</strong> Giá trị tối thiểu là <strong>{MIN_ORDER_FOR_TABLE.toLocaleString('vi-VN')} ₫</strong> (hiện tại: {cartTotal.toLocaleString('vi-VN')} ₫).
                            </div>
                        )}

                        {editingOrderId && (
                            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', borderRadius: '0.75rem', color: '#1d4ed8' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Edit3 size={18} /> Đang chỉnh sửa đơn hàng #{editingOrderId}</div>
                                <div style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Thêm bớt món ăn và nhấn cập nhật để lưu thay đổi. Bạn có thể quay lại thực đơn để thêm món.</div>
                                <button onClick={handleCancelEdit} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '100%' }}>Hủy chỉnh sửa</button>
                            </div>
                        )}

                        {/* ===== BOOKING SUMMARY TỪ TRANG ĐẶT BÀN ===== */}
                        {hasPendingBooking && !editingOrderId && (
                            <div style={{ marginBottom: '1.5rem', borderRadius: '0.85rem', border: '1px solid rgba(249,115,22,0.3)', overflow: 'hidden' }}>
                                <div style={{ padding: '0.75rem 1rem', background: 'rgba(249,115,22,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#f97316', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        🍽️ Đặt bàn kèm theo
                                        {bookingForm.id_ban && (() => {
                                            const t = tables.find(x => x.id_ban === Number(bookingForm.id_ban));
                                            return t ? (
                                                <span style={{
                                                    background: 'rgba(249,115,22,0.18)', color: '#f97316',
                                                    borderRadius: '0.4rem', padding: '0.1rem 0.5rem',
                                                    fontSize: '0.8rem', fontWeight: '800'
                                                }}>{t.tenBan}</span>
                                            ) : null;
                                        })()}
                                    </span>
                                    <button
                                        onClick={() => {
                                            if (editingPendingBooking) {
                                                // Bấm "Xong": validate trước khi đóng
                                                if (!bookingForm.time) {
                                                    showAlert('Vui lòng chọn giờ đến trước khi lưu.', 'error');
                                                    return;
                                                }
                                                if (editTimeError) {
                                                    showAlert(editTimeError.replace('⚠ ', ''), 'error');
                                                    return;
                                                }
                                            }
                                            setEditingPendingBooking(v => !v);
                                        }}
                                        style={{ background: 'none', border: 'none', color: '#f97316', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '600' }}
                                    >
                                        <Edit3 size={13} /> {editingPendingBooking ? 'Xong' : 'Chỉnh sửa'}
                                    </button>
                                </div>

                                {!editingPendingBooking ? (
                                    /* Chế độ xem */
                                    <div style={{ padding: '0.85rem 1rem', display: 'grid', gap: '0.4rem', fontSize: '0.875rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Bàn</span>
                                            <strong>
                                                {bookingForm.id_ban
                                                    ? `Bàn #${bookingForm.id_ban}`
                                                    : 'Chưa chọn'}
                                            </strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Ngày đến</span>
                                            <strong>{bookingForm.date ? new Date(bookingForm.date).toLocaleDateString('vi-VN') : '—'}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Giờ đến</span>
                                            <strong>{bookingForm.time || '—'}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Số người</span>
                                            <strong>{bookingForm.soNguoi} người</strong>
                                        </div>
                                        {bookingForm.ghiChu && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>Ghi chú</span>
                                                <strong style={{ textAlign: 'right', maxWidth: '55%' }}>{bookingForm.ghiChu}</strong>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* Chế độ chỉnh sửa */
                                    (() => {
                                        const selectedTableData = tables.find(t => t.id_ban === Number(bookingForm.id_ban));
                                        const maxNguoi = selectedTableData?.sucChua || 20;
                                        const wh = editWorkingHours;
                                        const isNghi = wh?.isNghi;
                                        return (
                                            <div style={{ padding: '0.85rem 1rem', display: 'grid', gap: '0.85rem' }}>
                                                {/* Chọn ngày */}
                                                <div className="input-group mb-0">
                                                    <label className="input-label" style={{ fontSize: '0.8rem' }}>📅 Ngày đến</label>
                                                    <input type="date" className="input-field" value={bookingForm.date} min={todayString}
                                                        onChange={e => setBookingForm(f => ({ ...f, date: e.target.value, time: '' }))}
                                                        style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                                                    />
                                                </div>

                                                {/* Cảnh báo ngày nghỉ */}
                                                {isNghi && (
                                                    <div style={{ padding: '0.6rem 0.85rem', borderRadius: '0.5rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', fontSize: '0.8rem', color: '#dc2626' }}>
                                                        ⚠️ Nhà hàng nghỉ ngày này. Vui lòng chọn ngày khác.
                                                    </div>
                                                )}

                                                {/* Giờ làm việc info */}
                                                {!isNghi && wh && (
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                        <Clock size={12} /> Giờ hoạt động: <strong>{wh.gioMoCua} – {wh.gioDongCua}</strong>
                                                    </div>
                                                )}

                                                {/* Slot picker */}
                                                <div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                                        <label className="input-label" style={{ fontSize: '0.8rem', margin: 0 }}>🕐 Chọn giờ đến</label>
                                                        {/* Ô nhập giờ tùy chỉnh */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>hoặc nhập:</span>
                                                            <input
                                                                type="time"
                                                                value={bookingForm.time}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    setBookingForm(f => ({ ...f, time: val }));
                                                                    if (!val) { setEditTimeError(''); return; }
                                                                    const chosen = new Date(`${bookingForm.date}T${val}:00`);
                                                                    // 1. Giờ đã qua
                                                                    if (chosen <= new Date()) {
                                                                        setEditTimeError('⚠ Giờ này đã qua, vui lòng chọn giờ khác.');
                                                                        return;
                                                                    }
                                                                    // 2. Ngoài giờ làm việc
                                                                    if (wh && !isNghi) {
                                                                        const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
                                                                        const vMin = toMin(val);
                                                                        if (vMin < toMin(wh.gioMoCua) || vMin > toMin(wh.gioDongCua) - 15) {
                                                                            setEditTimeError(`⚠ Ngoài giờ hoạt động (${wh.gioMoCua}–${wh.gioDongCua}).`);
                                                                            return;
                                                                        }
                                                                    }
                                                                    // 3. Trùng slot đã đặt hoặc bị khóa
                                                                    const conflict = editTimeline.find(slot => {
                                                                        if (slot.trangThai !== 'Đã có người đặt' && slot.trangThai !== 'Không đủ thời gian') return false;
                                                                        const s = new Date(slot.batDau);
                                                                        const end = slot.ketThuc ? new Date(slot.ketThuc) : new Date(s.getTime() + 60 * 60 * 1000);
                                                                        return chosen >= s && chosen < end;
                                                                    });
                                                                    if (conflict) {
                                                                        setEditTimeError('⚠ Khung giờ này đã có người đặt, vui lòng chọn giờ khác.');
                                                                        return;
                                                                    }
                                                                    setEditTimeError('');
                                                                }}
                                                                style={{
                                                                    border: `1px solid ${editTimeError ? '#ef4444' : 'var(--border)'}`,
                                                                    borderRadius: '0.4rem',
                                                                    padding: '0.2rem 0.4rem', fontSize: '0.78rem',
                                                                    background: 'var(--surface)', color: 'var(--text)',
                                                                    width: '110px'
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    {editTimeError && (
                                                        <div style={{ fontSize: '0.75rem', color: '#ef4444', marginBottom: '0.4rem' }}>{editTimeError}</div>
                                                    )}

                                                    {editTimelineLoading ? (
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Đang tải khung giờ...</div>
                                                    ) : editTimeline.length === 0 ? (
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Không có khung giờ trống ngày này.</div>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                            {editTimeline.map((slot, i) => {
                                                                const slotStart = new Date(slot.batDau);
                                                                const slotTime = slotStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
                                                                const isPast = slotStart <= new Date();
                                                                const isBooked = slot.trangThai === 'Đã có người đặt';
                                                                const isBlocked = slot.trangThai === 'Không đủ thời gian';
                                                                const isSelected = bookingForm.time === slotTime;
                                                                const disabled = isPast || isBooked || isBlocked;
                                                                const bgColor = isSelected
                                                                    ? 'rgba(249,115,22,0.15)'
                                                                    : isPast
                                                                        ? 'rgba(100,100,100,0.06)'
                                                                        : (isBooked || isBlocked)
                                                                            ? 'rgba(239,68,68,0.07)'
                                                                            : 'var(--surface)';
                                                                const textColor = isSelected
                                                                    ? '#f97316'
                                                                    : isPast
                                                                        ? '#6b7280'
                                                                        : (isBooked || isBlocked)
                                                                            ? '#9ca3af'
                                                                            : 'var(--text)';
                                                                return (
                                                                    <button key={i} type="button" disabled={disabled}
                                                                        onClick={() => { if (!disabled) { setBookingForm(f => ({ ...f, time: slotTime })); setEditTimeError(''); } }}
                                                                        title={isPast ? 'Giờ này đã qua' : (isBooked ? 'Đã có người đặt' : '')}
                                                                        style={{
                                                                            padding: '0.3rem 0.65rem', borderRadius: '0.4rem', fontSize: '0.78rem', fontWeight: '600',
                                                                            border: isSelected ? '2px solid #f97316' : '1px solid var(--border)',
                                                                            background: bgColor,
                                                                            color: textColor,
                                                                            cursor: disabled ? 'not-allowed' : 'pointer',
                                                                            textDecoration: (isBooked || isBlocked) ? 'line-through' : 'none',
                                                                            opacity: isPast ? 0.45 : 1,
                                                                        }}
                                                                    >
                                                                        {slotTime}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                    {bookingForm.time && !editTimeError && (
                                                        <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: '0.35rem' }}>✓ Đã chọn: {bookingForm.time}</div>
                                                    )}
                                                </div>


                                                {/* Số người */}
                                                <div className="input-group mb-0">
                                                    <label className="input-label" style={{ fontSize: '0.8rem' }}>
                                                        👥 Số người <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>(tối đa {maxNguoi})</span>
                                                    </label>
                                                    <input type="number" className="input-field" value={bookingForm.soNguoi} min={1} max={maxNguoi}
                                                        onChange={e => {
                                                            const val = parseInt(e.target.value) || 1;
                                                            const clamped = Math.min(Math.max(1, val), maxNguoi);
                                                            setBookingForm(f => ({ ...f, soNguoi: clamped }));
                                                            setEditSoNguoiError(val > maxNguoi ? `Bàn này chỉ chứa tối đa ${maxNguoi} người.` : val < 1 ? 'Số người phải ít nhất là 1.' : '');
                                                        }}
                                                        style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem', borderColor: editSoNguoiError ? '#ef4444' : '' }}
                                                    />
                                                    {editSoNguoiError && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{editSoNguoiError}</div>}
                                                </div>

                                                {/* Ghi chú */}
                                                <div className="input-group mb-0">
                                                    <label className="input-label" style={{ fontSize: '0.8rem' }}>📝 Ghi chú</label>
                                                    <input type="text" className="input-field" value={bookingForm.ghiChu} placeholder="Yêu cầu đặc biệt..."
                                                        onChange={e => setBookingForm(f => ({ ...f, ghiChu: e.target.value }))}
                                                        style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                                                    />
                                                </div>

                                                <button
                                                    onClick={() => { setHasPendingBooking(false); setEditingPendingBooking(false); }}
                                                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem', textAlign: 'left' }}
                                                >
                                                    ✕ Bỏ đặt bàn kèm theo
                                                </button>
                                            </div>
                                        );
                                    })()
                                )}
                            </div>
                        )}


                        {!selectedTableId && !editingOrderId && !hasPendingBooking && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--text-main)', fontWeight: 'bold' }}>Thời gian tới <span style={{ color: 'red' }}>*</span></h3>
                                    {upcomingReservation && !isEditingTime && (
                                        <button
                                            className="btn btn-outline"
                                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}
                                            onClick={() => setIsEditingTime(true)}
                                            type="button"
                                        >
                                            <Edit3 size={14} /> Chỉnh sửa
                                        </button>
                                    )}
                                </div>
                                {upcomingReservation && !isEditingTime ? (
                                    <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Lấy từ lịch đặt bàn (#{upcomingReservation.id_datBan})</div>
                                        <div style={{ fontWeight: 'bold', color: '#059669', fontSize: '1.05rem' }}>
                                            {orderTime} - {new Date(orderDate).toLocaleDateString('vi-VN')}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="input-group mb-0">
                                            <label className="input-label" htmlFor="cart-order-date" style={{ fontSize: '0.85rem' }}><Calendar size={14} className="inline" /> Ngày đến</label>
                                            <input id="cart-order-date" type="date" className="input-field" value={orderDate}
                                                onChange={(e) => { setOrderDate(e.target.value); setTimelineSearch(prev => ({ ...prev, fromDate: e.target.value })); }}
                                                min={todayString} aria-label="Ngày đến dự kiến"
                                            />
                                        </div>
                                        <div className="input-group mb-0">
                                            <label className="input-label" htmlFor="cart-order-time" style={{ fontSize: '0.85rem' }}><Clock size={14} className="inline" /> Giờ đến</label>
                                            <input id="cart-order-time" type="time" className="input-field" value={orderTime}
                                                onChange={(e) => { setOrderTime(e.target.value); setTimelineSearch(prev => ({ ...prev, fromTime: e.target.value })); }}
                                                aria-label="Giờ đến dự kiến"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <button className="btn btn-primary w-full" style={{ padding: '1rem', fontSize: '1.05rem', display: 'inline-flex', justifyContent: 'center', gap: '0.5rem' }} onClick={handleCheckoutClick} disabled={isSubmitting}>
                            {isSubmitting ? 'Đang xử lý...' : (editingOrderId ? 'Cập nhật đơn hàng' : hasPendingBooking ? '💳 Xác nhận & Thanh toán' : 'Xác nhận đặt món')}
                        </button>
                        {!editingOrderId && (
                            <button className="btn btn-outline w-full mt-4" style={{ padding: '1rem', fontSize: '1rem' }} onClick={() => clearCart()} disabled={isSubmitting}>Xóa toàn bộ giỏ hàng</button>
                        )}
                    </div>
                </div>
            )}


            {/* MODAL HỎI ĐẶT BÀN CÓ TIMELINE */}
            <CartTimelineModal
                showModal={showModal}
                setShowModal={setShowModal}
                loadingTables={loadingTables}
                tables={tables}
                selectedTableFilter={selectedTableFilter}
                setSelectedTableFilter={setSelectedTableFilter}
                timelineSearch={timelineSearch}
                handleTimelineRangeChange={handleTimelineRangeChange}
                todayString={todayString}
                timelineLoading={timelineLoading}
                timelineDays={timelineDays}
                isSlotWithinSearchRange={isSlotWithinSearchRange}
                isBookedSlot={isBookedSlot}
                isBlockedSlot={isBlockedSlot}
                isWarningSlot={isWarningSlot}
                formatTimelineTime={formatTimelineTime}
                handlePickSlot={(dateString, table, slot) => {
                    if (isBookedSlot(slot) || isBlockedSlot(slot)) return;
                    const slotKey = `${dateString}-${table.id_ban}-${slot.batDau}`;
                    if (isWarningSlot(slot)) {
                        const confirmed = window.confirm(slot.warningMessage || 'Khung giờ này có giới hạn thời gian. Bạn có chắc chắn muốn đặt không?');
                        if (!confirmed) return;
                    }

                    const timeString = new Date(slot.batDau).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

                    setBookingForm({
                        ...bookingForm,
                        id_ban: table.id_ban,
                        date: dateString,
                        time: timeString
                    });

                    setSelectedSlotKey(slotKey);
                    setSelectedTableLocal(table);
                }}
                selectedSlotKey={selectedSlotKey}
                selectedTableLocal={selectedTableLocal}
                bookingForm={bookingForm}
                setBookingForm={setBookingForm}
                submitOrder={submitOrder}
                isSubmitting={isSubmitting}
            />

            {/* Sleek Custom Alert Modal */}
            <CartCustomAlert customAlert={customAlert} setCustomAlert={setCustomAlert} />
        </div>
    );
};

export default CartPage;