import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2, ArrowRight, ShoppingCart, Calendar, Clock, Users, Edit3 } from 'lucide-react';
import axios from 'axios';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const pad2 = (value) => String(value).padStart(2, '0');
const toLocalDateString = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const todayString = toLocalDateString(new Date());

const CartPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { cart, updateQuantity, removeFromCart, cartTotal, clearCart, selectedTableId, editingOrderId, setEditingOrderId } = useCart();

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
    const [editWorkingHours, setEditWorkingHours] = useState(null); // giờ làm việc ngày đã chọn
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
        toDate: nextWeekString,
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
    const [customAlert, setCustomAlert] = useState({ show: false, message: '', type: 'info', onClose: null });


    const showAlert = (message, type = 'info', onClose = null) => {
        setCustomAlert({ show: true, message, type, onClose });
    };

    const toMinutes = (value) => {
        if (!value) return null;
        const [hours, minutes] = value.split(':').map(Number);
        return (hours * 60) + minutes;
    };

    const buildDateRange = (startDate, endDate) => {
        if (!startDate || !endDate) return [];
        const dates = [];
        const current = new Date(`${startDate}T00:00:00`);
        const end = `${endDate}T00:00:00`;
        if (Number.isNaN(current.getTime())) return [];
        while (`${toLocalDateString(current)}T00:00:00` <= end) {
            dates.push(toLocalDateString(current));
            current.setDate(current.getDate() + 1);
        }
        return dates;
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
                // workingHours đã có sẵn trong timeline response
                setEditWorkingHours(raw?.workingHours || null);
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

    const formatTimelineTime = (value, isEnd = false) => {
        const hours = value.getHours();
        const minutes = value.getMinutes();
        if (isEnd && hours === 0 && minutes === 0) return '24:00';
        return value.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const isBookedSlot = (slot) => slot.trangThai === 'Đã có người đặt';
    const isBlockedSlot = (slot) => slot.trangThai === 'Không đủ thời gian';
    const isWarningSlot = (slot) => slot.trangThai === 'Có giới hạn giờ';

    const handlePickSlot = (dateString, table, slot) => {
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
    };

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

        if (!selectedTableId && orderDate && orderTime) {
            const currentDateTime = new Date();
            const selectedDateTime = new Date(`${orderDate}T${orderTime}:00`);
            if (selectedDateTime <= currentDateTime) {
                showAlert('Thời gian tới phải lớn hơn thời gian hiện tại.', 'error');
                return;
            }

            // Gọi API kiểm tra giờ làm việc của nhà hàng ngày hôm đó
            try {
                setIsSubmitting(true);
                const response = await axios.get(`${BASE_URL}/api/gio-lam-viec`, {
                    params: { ngay: orderDate }
                });
                const wh = response.data;
                if (wh) {
                    if (wh.isNghi) {
                        showAlert(`Nhà hàng nghỉ vào ngày ${new Date(orderDate).toLocaleDateString('vi-VN')}. Vui lòng chọn ngày khác.`, 'warning');
                        setIsSubmitting(false);
                        return;
                    }

                    const openMinutes = toMinutes(wh.gioMoCua);
                    const closeMinutes = toMinutes(wh.gioDongCua);
                    const selectedMinutes = toMinutes(orderTime);

                    if (selectedMinutes < openMinutes || selectedMinutes > (closeMinutes - 15)) {
                        showAlert(`Cửa hàng chưa mở cửa vào khung giờ này (giờ hoạt động từ ${wh.gioMoCua} đến ${wh.gioDongCua}). Vui lòng hẹn giờ trong khung giờ này và trước lúc đóng cửa ít nhất 15 phút.`, 'warning');
                        setIsSubmitting(false);
                        return;
                    }
                }
            } catch (err) {
                console.error("Lỗi khi kiểm tra giờ làm việc của nhà hàng:", err);
            } finally {
                setIsSubmitting(false);
            }
        }

        if (selectedTableId || (upcomingReservation && !isEditingTime)) {
            submitOrder(false);
        } else {
            // Sync timeline search với giờ/ngày đã nhập
            setTimelineSearch(prev => ({
                ...prev,
                fromDate: orderDate || prev.fromDate,
                fromTime: orderTime || prev.fromTime,
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
                // Không cần thanh toán thêm → cập nhật ngay
                clearCart();
                setEditingOrderId(null);
                showAlert('Cập nhật đơn hàng thành công!', 'success', () => {
                    navigate('/account');
                });
            } else if (res.data.status === 'payment_required') {
                const { so_tien_them, old_total, new_total, diff, hinhThucThanhToan, paymentUrl } = res.data;
                const soTienThemStr = Number(so_tien_them).toLocaleString('vi-VN');
                const diffStr = Number(diff || (new_total - old_total)).toLocaleString('vi-VN');
                const oldStr = Number(old_total).toLocaleString('vi-VN');
                const newStr = Number(new_total).toLocaleString('vi-VN');
                const modeNote = hinhThucThanhToan === 'deposit'
                    ? `(10% cọc của phần tăng thêm ${diffStr} ₫)`
                    : `(toàn bộ phần tăng thêm)`;

                showAlert(
                    `Tổng đơn tăng từ ${oldStr} ₫ → ${newStr} ₫.\n\nBạn cần cọc thêm: ${soTienThemStr} ₫ ${modeNote}\n\nNhấn OK để chuyển đến trang thanh toán VNPay.`,
                    'warning',
                    () => {
                        clearCart();
                        setEditingOrderId(null);
                        window.location.href = paymentUrl;
                    }
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
                const qrPayload = {
                    chi_tiet: payload.cart.map(item => ({
                        id_monAn: item.id_monAn,
                        soLuong: item.soLuong,
                        giaTaiThoiDiemBan: item.giaTaiThoiDiemBan
                    }))
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
            {showPaymentChoice && pendingPayload && (() => {
                // Lấy tiền cọc thực của bàn đã chọn
                const tableId = pendingPayload.dat_ban?.id_ban || pendingPayload.id_ban || null;
                const selectedTableData = tableId ? tables.find(t => t.id_ban === Number(tableId)) : null;
                const TABLE_FEE = selectedTableData?.tienCocMacDinh ?? 50_000;
                const billTotal = pendingPayload.cart.reduce((s, i) => s + i.giaTaiThoiDiemBan * i.soLuong, 0);
                const depositAmt = Math.ceil(billTotal * 0.1) + TABLE_FEE;  // 10% bill + phí giữ bàn
                const fullAmt = Math.ceil(billTotal);                        // 100% bill, miễn phí giữ bàn

                return (
                    <div style={{ maxWidth: '620px', margin: '0 auto' }}>
                        {/* Tiêu đề */}
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: '72px', height: '72px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #0066cc, #004fa3)',
                                boxShadow: '0 0 0 14px rgba(0,102,204,0.1)',
                                fontSize: '2rem', marginBottom: '1.25rem', color: '#fff',
                            }}>💳</div>
                            <h1 style={{ fontSize: '1.85rem', fontWeight: '800', marginBottom: '0.5rem' }}>
                                Xác nhận thanh toán
                            </h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                                Chọn hình thức thanh toán để hoàn tất đặt bàn &amp; đặt món.
                                <br />Bàn chỉ được giữ sau khi thanh toán thành công.
                            </p>
                        </div>

                        {/* Tóm tắt hóa đơn */}
                        <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
                            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: '700' }}>Chi tiết hóa đơn</h3>
                            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
                                {pendingPayload.cart.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                                        <span>× {item.soLuong}</span>
                                        <span style={{ flex: 1, paddingLeft: '0.75rem' }}>{item.tenMon || `Món #${item.id_monAn}`}</span>
                                        <strong>{(item.giaTaiThoiDiemBan * item.soLuong).toLocaleString('vi-VN')} ₫</strong>
                                    </div>
                                ))}
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Tổng món ăn</span>
                                    <strong>{Math.ceil(billTotal).toLocaleString('vi-VN')} ₫</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                    <span>Phí giữ bàn <em>(chỉ áp dụng khi đặt cọc)</em></span>
                                    <span>{TABLE_FEE.toLocaleString('vi-VN')} ₫</span>
                                </div>
                            </div>
                        </div>


                        {/* Cảnh báo */}
                        <div style={{ padding: '0.85rem 1.1rem', borderRadius: '0.75rem', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#92400e', lineHeight: 1.6 }}>
                            ⚠️ <strong>Bàn chỉ được xác nhận sau khi thanh toán VNPay thành công.</strong> Nếu không đến đúng giờ, tiền cọc sẽ <strong style={{ color: '#dc2626' }}>không được hoàn lại</strong>.
                        </div>

                        {/* Hai lựa chọn */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                            {/* Đặt cọc */}
                            <div style={{ padding: '1.25rem', borderRadius: '1rem', border: '2px solid rgba(202,138,4,0.5)', background: 'rgba(234,179,8,0.04)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ fontWeight: '800', color: '#92400e' }}>Đặt cọc trước</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                    10% hóa đơn + {TABLE_FEE.toLocaleString('vi-VN')} ₫ phí bàn.<br />Trả phần còn lại khi đến ăn.
                                </div>
                                <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#ca8a04' }}>
                                    {depositAmt.toLocaleString('vi-VN')} ₫
                                </div>
                                <button
                                    disabled={isSubmitting}
                                    onClick={() => initiatePayment('deposit')}
                                    style={{
                                        padding: '0.65rem', borderRadius: '0.65rem', border: 'none',
                                        background: payingMode === 'deposit' ? '#b45309' : 'linear-gradient(135deg, #ca8a04, #92400e)',
                                        color: '#fff', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                        fontSize: '0.875rem', boxShadow: '0 3px 10px rgba(202,138,4,0.3)',
                                        opacity: isSubmitting && payingMode !== 'deposit' ? 0.5 : 1,
                                    }}
                                >
                                    {payingMode === 'deposit' ? 'Đang xử lý...' : 'Đặt cọc qua VNPay'}
                                </button>
                            </div>

                            {/* Thanh toán toàn bộ */}
                            <div style={{ padding: '1.25rem', borderRadius: '1rem', border: '2px solid rgba(16,185,129,0.5)', background: 'rgba(16,185,129,0.04)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ fontWeight: '800', color: '#065f46' }}>Trả trước toàn bộ</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                    Thanh toán 100% hóa đơn ngay.<br /><strong style={{ color: '#059669' }}>Miễn phí giữ bàn</strong>, không trả thêm khi đến.
                                </div>
                                <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#059669' }}>
                                    {fullAmt.toLocaleString('vi-VN')} ₫
                                </div>
                                <button
                                    disabled={isSubmitting}
                                    onClick={() => initiatePayment('full')}
                                    style={{
                                        padding: '0.65rem', borderRadius: '0.65rem', border: 'none',
                                        background: payingMode === 'full' ? '#047857' : 'linear-gradient(135deg, #10b981, #059669)',
                                        color: '#fff', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                        fontSize: '0.875rem', boxShadow: '0 3px 10px rgba(16,185,129,0.3)',
                                        opacity: isSubmitting && payingMode !== 'full' ? 0.5 : 1,
                                    }}
                                >
                                    {payingMode === 'full' ? 'Đang xử lý...' : 'Thanh toán qua VNPay'}
                                </button>
                            </div>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            <button
                                onClick={() => { setShowPaymentChoice(false); setPendingPayload(null); }}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline' }}
                            >
                                ← Quay lại giỏ hàng
                            </button>
                        </div>
                    </div>
                );
            })()}

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
                                <div key={item.id_monAn} style={{ display: 'grid', gridTemplateColumns: '88px 1fr auto', gap: '1rem', padding: '1rem', borderRadius: '0.75rem', background: 'var(--surface-light)', marginBottom: '0.75rem', alignItems: 'center' }}>
                                    <img src={item.hinhAnh || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'} alt={item.tenMon} style={{ width: '88px', height: '88px', objectFit: 'cover', borderRadius: '0.75rem' }} />
                                    <div>
                                        <h3 style={{ marginBottom: '0.35rem', fontSize: '1.05rem' }}>{item.tenMon}</h3>
                                        <p style={{ color: 'var(--primary)', fontWeight: 'bold', marginBottom: '0.75rem' }}>{Number(item.giaTien).toLocaleString('vi-VN')} đ</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <button className="btn btn-outline" style={{ padding: '0.35rem' }} onClick={() => updateQuantity(item.id_monAn, -1)} aria-label={`Giảm số lượng ${item.tenMon}`}><Minus size={16} /></button>
                                            <span style={{ minWidth: '28px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</span>
                                            <button className="btn btn-outline" style={{ padding: '0.35rem' }} onClick={() => updateQuantity(item.id_monAn, 1)} aria-label={`Tăng số lượng ${item.tenMon}`}><Plus size={16} /></button>
                                        </div>
                                    </div>
                                    <button className="btn" style={{ padding: '0.5rem', background: 'transparent', color: 'var(--danger)' }} onClick={() => removeFromCart(item.id_monAn)} aria-label={`Xóa ${item.tenMon} khỏi giỏ hàng`}><Trash2 size={18} /></button>
                                </div>
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
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999, padding: '1rem'
                }}>
                    <div className="card" style={{ maxWidth: '800px', width: '100%', padding: '2rem', animation: 'fadeIn 0.2s ease-out', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="flex justify-between items-start mb-4">
                            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>
                                Bạn có muốn đặt bàn dùng bữa tại quán cùng với đơn hàng này không?
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0.5rem', lineHeight: 1 }}
                                aria-label="Đóng"
                            >✕</button>
                        </div>

                        <div style={{
                            background: 'rgba(249, 115, 22, 0.1)',
                            borderBottom: '2px solid var(--primary)',
                            padding: '1rem',
                            borderRadius: '0.5rem',
                            marginBottom: '1.5rem',
                            color: 'var(--text-main)',
                            fontSize: '0.9rem'
                        }}>
                            <strong>Lưu ý:</strong> Đặt bàn ngay để chúng tôi giữ chỗ và chuẩn bị sẵn các món ăn nóng hổi ngay khi bạn vừa đến!
                        </div>

                        {/* CHỌN BÀN */}
                        <div style={{ marginBottom: '1.5rem', border: '1px solid var(--border)', padding: '1rem', borderRadius: '0.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0' }}>Chọn bàn</h3>
                            {loadingTables ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Đang tải bàn...</p>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {tables.map(table => {
                                        const isSelected = selectedTableFilter === table.id_ban;
                                        return (
                                            <button
                                                key={table.id_ban}
                                                type="button"
                                                onClick={() => setSelectedTableFilter(isSelected ? null : table.id_ban)}
                                                style={{
                                                    padding: '0.75rem',
                                                    borderRadius: '0.75rem',
                                                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                                                    background: isSelected ? 'rgba(249, 115, 22, 0.1)' : 'var(--surface)',
                                                    fontSize: '0.875rem',
                                                    textAlign: 'left'
                                                }}
                                            >
                                                <div style={{ fontWeight: 'bold', fontSize: '1rem', color: isSelected ? 'var(--primary)' : 'var(--text)' }}>{table.tenBan}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{table.viTri} · {table.sucChua} chỗ</div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* KHU VỰC CHỌN GIỜ THEO TIMELINE */}
                        <div style={{ marginBottom: '1.5rem', border: '1px solid var(--border)', padding: '1rem', borderRadius: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Thời gian tới</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="input-group mb-0">
                                    <label className="input-label" htmlFor="timeline-from-date" style={{ fontSize: '0.85rem' }}><Calendar size={14} className="inline" /> Ngày đến</label>
                                    <input
                                        id="timeline-from-date"
                                        type="date" name="fromDate"
                                        className="input-field"
                                        value={timelineSearch.fromDate}
                                        onChange={handleTimelineRangeChange}
                                        min={todayString}
                                        aria-label="Ngày đến lọc timeline"
                                    />
                                </div>
                                <div className="input-group mb-0">
                                    <label className="input-label" htmlFor="timeline-from-time" style={{ fontSize: '0.85rem' }}><Clock size={14} className="inline" /> Lọc từ giờ</label>
                                    <input
                                        id="timeline-from-time"
                                        type="time" name="fromTime"
                                        className="input-field"
                                        value={timelineSearch.fromTime}
                                        onChange={handleTimelineRangeChange}
                                        aria-label="Giờ đến lọc timeline"
                                    />
                                </div>
                            </div>

                            {/* HIỂN THỊ TIMELINE */}
                            <div style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                                {timelineLoading ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Đang tải timeline...</p>
                                ) : timelineDays.length > 0 ? (
                                    timelineDays.map((day) => {
                                        const dayKey = day.date || day.ngay;
                                        return (
                                            <div key={dayKey}>
                                                {day.tables.map(entry => {
                                                    if (selectedTableFilter && entry.table.id_ban !== selectedTableFilter) return null;
                                                    const table = entry.table;
                                                    const filteredSlots = entry.slots.filter(slot => isSlotWithinSearchRange(new Date(slot.batDau)));
                                                    if (filteredSlots.length === 0) return null;
                                                    return (
                                                        <div key={table.id_ban} style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--surface)' }}>
                                                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{table.tenBan} ({new Date(dayKey).toLocaleDateString('vi-VN')})</div>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem' }}>
                                                                {filteredSlots.map(slot => {
                                                                    const slotStartDate = new Date(slot.batDau);
                                                                    const isPastSlot = slotStartDate <= new Date();
                                                                    const booked = isBookedSlot(slot);
                                                                    const blocked = isBlockedSlot(slot);
                                                                    const warning = isWarningSlot(slot);
                                                                    const slotKey = `${dayKey}-${table.id_ban}-${slot.batDau}`;
                                                                    const isSelectedSlot = selectedSlotKey === slotKey;
                                                                    const isDisabled = booked || blocked || isPastSlot;
                                                                    return (
                                                                        <button
                                                                            key={slotKey}
                                                                            type="button"
                                                                            disabled={isDisabled}
                                                                            onClick={() => !isPastSlot && handlePickSlot(dayKey, table, slot)}
                                                                            style={{
                                                                                padding: '0.5rem',
                                                                                borderRadius: '0.5rem',
                                                                                border: isSelectedSlot ? '2px solid #2563eb' : '1px solid var(--border)',
                                                                                background: isPastSlot ? 'var(--surface-light)' : booked || blocked ? '#fee2e2' : isSelectedSlot ? '#dbeafe' : warning ? '#fef3c7' : '#d1fae5',
                                                                                color: isPastSlot ? 'var(--text-muted)' : booked || blocked ? '#ef4444' : isSelectedSlot ? '#2563eb' : warning ? '#d97706' : '#059669',
                                                                                textAlign: 'center',
                                                                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                                                opacity: isDisabled ? 0.6 : 1
                                                                            }}
                                                                        >
                                                                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{formatTimelineTime(new Date(slot.batDau))}</div>
                                                                            <div style={{ fontSize: '0.65rem', marginTop: '0.15rem' }}>
                                                                                {isPastSlot ? 'Đã qua' : booked ? 'Đã đặt' : blocked ? 'Kín' : warning ? 'Có giới hạn' : 'Trống'}
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Không có dữ liệu timeline.</p>
                                )}
                            </div>
                        </div>

                        {/* THÔNG TIN BỔ SUNG NẾU ĐÃ CHỌN BÀN */}
                        {selectedTableLocal && bookingForm.time && (
                            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--text)', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                                <div style={{ color: '#059669', marginBottom: '0.75rem', fontWeight: 'bold' }}>
                                    Đã chọn <strong>{selectedTableLocal.tenBan}</strong> lúc <strong>{bookingForm.time} ({bookingForm.date})</strong>.
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="input-group mb-0">
                                        <label className="input-label" htmlFor="booking-so-nguoi" style={{ fontSize: '0.85rem' }}><Users size={14} className="inline" /> Số người</label>
                                        <input
                                            id="booking-so-nguoi"
                                            type="number" min="1"
                                            className="input-field"
                                            value={bookingForm.soNguoi}
                                            onChange={e => setBookingForm({ ...bookingForm, soNguoi: e.target.value })}
                                            aria-label="Số người đi cùng"
                                        />
                                    </div>
                                    <div className="input-group mb-0">
                                        <label className="input-label" htmlFor="booking-ghi-chu" style={{ fontSize: '0.85rem' }}><Edit3 size={14} className="inline" /> Ghi chú</label>
                                        <input
                                            id="booking-ghi-chu"
                                            type="text" placeholder="Thêm yêu cầu..."
                                            className="input-field"
                                            value={bookingForm.ghiChu}
                                            onChange={e => setBookingForm({ ...bookingForm, ghiChu: e.target.value })}
                                            aria-label="Ghi chú thêm cho đặt bàn"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                            <button
                                className="btn btn-outline"
                                onClick={() => submitOrder(false)}
                                disabled={isSubmitting}
                            >
                                Không, chỉ đặt món
                            </button>

                            <button
                                className="btn btn-primary"
                                onClick={() => submitOrder(true)}
                                disabled={isSubmitting || !bookingForm.id_ban || !bookingForm.date || !bookingForm.time}
                                title={(!bookingForm.id_ban || !bookingForm.time) ? 'Vui lòng chọn 1 khung giờ trống ở trên' : ''}
                            >
                                Có, Đặt bàn kèm món
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Sleek Custom Alert Modal */}
            {customAlert.show && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 10000, padding: '1rem',
                    backdropFilter: 'blur(8px)',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div className="card" style={{
                        maxWidth: '420px', width: '100%',
                        padding: '2rem',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'linear-gradient(135deg, #1e1e24 0%, #121214 100%)',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                        borderRadius: '1rem',
                        textAlign: 'center',
                        transform: 'scale(1)',
                        animation: 'scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}>
                        <div style={{
                            width: '56px', height: '56px',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1.25rem auto',
                            background: customAlert.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : customAlert.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(249, 115, 22, 0.12)',
                            color: customAlert.type === 'success' ? '#10b981' : customAlert.type === 'error' ? '#ef4444' : '#fb923c',
                            border: `1px solid ${customAlert.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : customAlert.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(249, 115, 22, 0.2)'}`
                        }}>
                            {customAlert.type === 'success' ? (
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                            ) : customAlert.type === 'error' ? (
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                </svg>
                            ) : (
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.084 1.085l-.041.02H11.25zm0 5.25h.008v.008H11.25V16.5zm-9-4.5a9 9 0 1118 0 9 9 0 01-18 0z" />
                                </svg>
                            )}
                        </div>

                        <h3 style={{
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            color: 'var(--text-main)',
                            marginBottom: '0.75rem'
                        }}>
                            {customAlert.type === 'success' ? 'Thành công' : customAlert.type === 'error' ? 'Có lỗi xảy ra' : 'Thông báo'}
                        </h3>

                        <p style={{
                            color: 'var(--text-muted)',
                            fontSize: '0.925rem',
                            lineHeight: '1.5',
                            marginBottom: '1.75rem',
                            whiteSpace: 'pre-line'
                        }}>
                            {customAlert.message}
                        </p>

                        <button
                            onClick={() => {
                                const onCloseCb = customAlert.onClose;
                                setCustomAlert({ show: false, message: '', type: 'info', onClose: null });
                                if (onCloseCb) onCloseCb();
                            }}
                            className="btn btn-primary"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                letterSpacing: '0.025em',
                                background: customAlert.type === 'success' ? '#10b981' : customAlert.type === 'error' ? '#ef4444' : 'var(--primary)',
                                border: 'none',
                                color: '#fff',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            aria-label="Xác nhận đóng thông báo"
                        >
                            Đồng ý
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CartPage;