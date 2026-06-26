import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { BASE_URL } from './customerDashboardUtils';

const useCustomerDashboard = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { setCartFromOrder } = useCart();

    const [data, setData] = useState({ reservations: [], orders: [] });
    const { reservations, orders } = data;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [checkinLoadingId, setCheckinLoadingId] = useState(null);
    const [actionMessage, setActionMessage] = useState('');
    const [checkinToast, setCheckinToast] = useState('');

    // Order modal
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderDetailLoading, setOrderDetailLoading] = useState(false);
    const [showOrderModal, setShowOrderModal] = useState(false);

    // Reservation modal
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [showReservationModal, setShowReservationModal] = useState(false);

    // Review modal
    const [reviews, setReviews] = useState([]);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewForm, setReviewForm] = useState({ id_donHang: null, soSao: 5, noiDung: '' });
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    // QR Payment modal
    const [qrModal, setQrModal] = useState(null);
    const [copiedField, setCopiedField] = useState(null);

    // ─── Auto-dismiss toast ───────────────────────────────────────────
    useEffect(() => {
        if (!checkinToast) return undefined;
        const id = window.setTimeout(() => setCheckinToast(''), 3500);
        return () => window.clearTimeout(id);
    }, [checkinToast]);

    // ─── Fetch data ───────────────────────────────────────────────────
    const fetchCustomerData = async (isSilent = false) => {
        if (!user) { setLoading(false); return; }
        if (!isSilent) setLoading(true);
        setError('');
        try {
            const [reservationRes, orderRes, reviewRes] = await Promise.all([
                axios.get(`${BASE_URL}/api/datban/me`),
                axios.get(`${BASE_URL}/api/donhang/me`),
                axios.get(`${BASE_URL}/api/danhgia/me`),
            ]);
            setData({ reservations: reservationRes.data || [], orders: orderRes.data || [] });
            setReviews(reviewRes.data || []);
        } catch (err) {
            console.error('Failed to load customer dashboard', err);
            if (!isSilent) setError('Không thể tải dữ liệu khách hàng. Vui lòng thử lại sau.');
        } finally {
            if (!isSilent) setLoading(false);
        }
    };

    useEffect(() => { fetchCustomerData(false); }, [user]);

    useEffect(() => {
        if (!user) return;
        const interval = setInterval(() => fetchCustomerData(true), 10000);
        return () => clearInterval(interval);
    }, [user]);

    // ─── Computed values ──────────────────────────────────────────────
    const activeReservations = reservations.filter((r) =>
        ['Chờ xác nhận', 'Đã đặt'].includes(r.trangThai)
    ).length;
    const activeOrders = orders.filter((o) => o.tinhTrang !== 'Đã thanh toán').length;

    // ─── Handlers ────────────────────────────────────────────────────
    const handleCopyText = (text, fieldName) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleCheckin = async (reservationId) => {
        setCheckinLoadingId(reservationId);
        setActionMessage('');
        try {
            await axios.post(`${BASE_URL}/api/datban/${reservationId}/checkin`);
            setCheckinToast('Check-in thành công! Admin đã nhận thông báo.');
            setActionMessage('Check-in thành công. Admin đã nhận thông báo bàn của bạn đã tới nơi.');
            setData((current) => ({
                ...current,
                reservations: current.reservations.map((r) =>
                    r.id_datBan === reservationId
                        ? { ...r, trangThai: 'Đã checkin', thoiGianDenThucTe: new Date().toISOString() }
                        : r
                ),
            }));
        } catch (err) {
            console.error('Failed to check in', err);
            const msg = err.response?.data?.detail || 'Không thể check-in lúc này.';
            setCheckinToast(msg);
            setActionMessage(msg);
        } finally {
            setCheckinLoadingId(null);
        }
    };

    const handleVNPayPayment = async (paymentType, targetId, amount) => {
        try {
            const res = await axios.post(`${BASE_URL}/api/payment/create-vnpay-url`, {
                payment_type: paymentType, target_id: targetId, amount,
            });
            window.location.href = res.data.paymentUrl;
        } catch (err) {
            alert(err.response?.data?.detail || 'Không thể khởi tạo thanh toán. Vui lòng thử lại.');
        }
    };

    const handleViewOrder = async (orderId) => {
        setOrderDetailLoading(true);
        setShowOrderModal(true);
        try {
            const response = await axios.get(`${BASE_URL}/api/donhang/me/${orderId}`);
            setSelectedOrder(response.data);
        } catch (err) {
            console.error('Lỗi tải chi tiết đơn hàng', err);
            alert('Không thể tải chi tiết đơn hàng.');
            setShowOrderModal(false);
        } finally {
            setOrderDetailLoading(false);
        }
    };

    const handleCloseOrderModal = () => { setShowOrderModal(false); setSelectedOrder(null); };

    const handleEditOrder = async (order) => {
        try {
            // Fetch chi tiết đơn hàng đầy đủ (list orders không có chi_tiet)
            const res = await axios.get(`${BASE_URL}/api/donhang/me/${order.id_donHang}`);
            const fullOrder = res.data;
            // Chỉ lấy các món active (không lấy món "Đã hủy" từ lịch sử)
            const activeItems = (fullOrder.chi_tiet || []).filter(ct => ct.trangThaiMon !== 'Đã hủy');
            const cartItems = activeItems.map((ct) => ({
                id_monAn: ct.id_monAn,
                tenMon: ct.tenMon,
                hinhAnh: ct.hinhAnhMon,
                giaTien: Number(ct.giaTaiThoiDiemBan),
                quantity: ct.soLuong,
            }));
            // Lưu vào sessionStorage trước khi navigate để tránh race condition
            sessionStorage.setItem('pendingEditOrder', JSON.stringify({
                orderId: order.id_donHang,
                items: cartItems,
                thoiGianDen: fullOrder.thoiGianDen || null,
            }));
            navigate('/cart');
        } catch (err) {
            console.error('Lỗi khi tải chi tiết đơn hàng để chỉnh sửa:', err);
            alert('Không thể tải thông tin đơn hàng. Vui lòng thử lại.');
        }
    };

    const handleCheckinOrder = async (orderId) => {
        setCheckinLoadingId(orderId);
        setActionMessage('');
        try {
            await axios.put(`${BASE_URL}/api/donhang/me/${orderId}/checkin`);
            const orderRes = await axios.get(`${BASE_URL}/api/donhang/me`);
            setData((current) => ({ ...current, orders: orderRes.data }));
            setCheckinToast('Đã báo tới thành công!');
            setActionMessage('Bếp đã nhận được thông báo và bắt đầu chuẩn bị món cho bạn!');
        } catch (err) {
            console.error('Lỗi khi báo đã tới:', err);
            const msg = err.response?.data?.detail || 'Không thể báo đã tới.';
            setCheckinToast(msg);
            setActionMessage(msg);
        } finally {
            setCheckinLoadingId(null);
        }
    };

    const handleCancelReservation = async (reservationId, lyDoHuy) => {
        try {
            await axios.post(`${BASE_URL}/api/datban/${reservationId}/cancel`, { lyDoHuy });
            setData((current) => ({
                ...current,
                reservations: current.reservations.map((r) =>
                    r.id_datBan === reservationId
                        ? { ...r, trangThai: 'Đã hủy', lyDoHuy }
                        : r
                ),
            }));
            setCheckinToast('Đơn đặt bàn đã được hủy thành công.');
        } catch (err) {
            console.error('Lỗi khi hủy đặt bàn', err);
            const msg = err.response?.data?.detail || 'Không thể hủy đơn lúc này. Vui lòng thử lại.';
            setCheckinToast(msg);
            throw new Error(msg);
        }
    };

    const handleSubmittingReview = async (e) => {
        e.preventDefault();
        setIsSubmittingReview(true);
        try {
            const res = await axios.post(`${BASE_URL}/api/danhgia/`, {
                id_donHang: reviewForm.id_donHang,
                soSao: reviewForm.soSao,
                noiDung: reviewForm.noiDung,
            });
            setReviews((current) => [res.data, ...current]);
            setShowReviewModal(false);
            alert('Cảm ơn bạn đã gửi đánh giá và đóng góp ý kiến!');
        } catch (err) {
            console.error('Lỗi khi gửi đánh giá:', err);
            alert(err.response?.data?.detail || 'Không thể gửi đánh giá lúc này.');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleViewReservation = (reservation) => {
        setSelectedReservation(reservation);
        setShowReservationModal(true);
    };
    const handleCloseReservationModal = () => { setShowReservationModal(false); setSelectedReservation(null); };

    return {
        // auth / loading
        user, authLoading, loading, error,
        // data
        reservations, orders, reviews,
        activeReservations, activeOrders,
        // checkin
        checkinLoadingId, actionMessage, checkinToast,
        handleCheckin, handleCheckinOrder, handleCancelReservation,
        // order modal
        selectedOrder, orderDetailLoading, showOrderModal,
        handleViewOrder, handleCloseOrderModal, handleEditOrder,
        // reservation modal
        selectedReservation, showReservationModal,
        handleViewReservation, handleCloseReservationModal,
        // review modal
        showReviewModal, setShowReviewModal, reviewForm, setReviewForm, isSubmittingReview,
        handleSubmittingReview,
        // qr / vnpay
        qrModal, setQrModal, copiedField, handleCopyText, handleVNPayPayment,
        // cross-modal helpers (needed for linking order ↔ reservation modals)
        setShowOrderModal, setSelectedReservation, setShowReservationModal,
    };
};

export default useCustomerDashboard;
