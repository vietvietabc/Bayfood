import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';

const VNPayReturn = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { clearCart, setEditingOrderId } = useCart();

    // Params từ backend redirect (luồng mới)
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const id_donHang = searchParams.get('id_donHang');
    const id_datBan = searchParams.get('id_datBan');
    const id_ban = searchParams.get('id_ban');
    const amount = searchParams.get('amount');
    const mode = searchParams.get('mode');
    const ref = searchParams.get('ref');
    const code = searchParams.get('code');

    // Fallback: VNPay redirect thẳng về frontend (RETURN_URL cũ trỏ tới :5173)
    const vnpResponseCode = searchParams.get('vnp_ResponseCode');
    const vnpTxnRef = searchParams.get('vnp_TxnRef');
    const vnpAmount = searchParams.get('vnp_Amount');

    // Xác định trạng thái cuối: ưu tiên status từ backend, fallback sang vnp_ params
    const resolvedStatus = status
        || (vnpResponseCode === '00' ? 'vnp_success' : vnpResponseCode ? 'vnp_failed' : null);

    const isSuccess = resolvedStatus === 'success' || resolvedStatus === 'vnp_success';

    const fmtMoney = (v) => v ? Number(v).toLocaleString('vi-VN') + ' ₫' : '';

    const statusInfo = {
        success: {
            icon: '✓',
            iconBg: 'linear-gradient(135deg, #10b981, #059669)',
            iconShadow: '0 0 0 16px rgba(16,185,129,0.12)',
            title: 'Thanh toán thành công!',
            subtitle: type === 'order_edit'
                ? 'Bổ sung thanh toán thành công. Đơn hàng đã được cập nhật thêm món!'
                : type === 'booking'
                    ? (id_donHang
                        ? 'Đặt bàn và đơn hàng đã được xác nhận thành công.'
                        : 'Bàn đã được đặt cọc và xác nhận. Bạn có thể chọn món ngay bây giờ!')
                    : 'Giao dịch hoàn tất.',
            color: '#10b981',
        },
        // Fallback khi VNPay redirect thẳng về frontend (RETURN_URL cũ)
        vnp_success: {
            icon: '✓',
            iconBg: 'linear-gradient(135deg, #10b981, #059669)',
            iconShadow: '0 0 0 16px rgba(16,185,129,0.12)',
            title: 'Thanh toán thành công!',
            subtitle: `Giao dịch hoàn tất. Mã GD: ${vnpTxnRef || 'N/A'} — Số tiền: ${vnpAmount ? (parseInt(vnpAmount) / 100).toLocaleString('vi-VN') + ' ₫' : 'N/A'}`,
            color: '#10b981',
        },
        vnp_failed: {
            icon: '✕',
            iconBg: 'linear-gradient(135deg, #ef4444, #dc2626)',
            iconShadow: '0 0 0 16px rgba(239,68,68,0.1)',
            title: 'Thanh toán thất bại',
            subtitle: `Giao dịch bị từ chối (mã lỗi VNPay: ${vnpResponseCode || 'N/A'}). Vui lòng thử lại.`,
            color: '#ef4444',
        },
        failed: {
            icon: '✕',
            iconBg: 'linear-gradient(135deg, #ef4444, #dc2626)',
            iconShadow: '0 0 0 16px rgba(239,68,68,0.1)',
            title: 'Thanh toán thất bại',
            subtitle: `Giao dịch bị từ chối (mã lỗi: ${code || 'N/A'}). Vui lòng thử lại.`,
            color: '#ef4444',
        },
        invalid_signature: {
            icon: '⚠',
            iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
            iconShadow: '0 0 0 16px rgba(245,158,11,0.1)',
            title: 'Chữ ký không hợp lệ',
            subtitle: 'Không thể xác thực kết quả giao dịch. Nếu tiền đã bị trừ, liên hệ hỗ trợ ngay.',
            color: '#f59e0b',
        },
        parse_error: {
            icon: '⚠',
            iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
            iconShadow: '0 0 0 16px rgba(245,158,11,0.1)',
            title: 'Lỗi xử lý giao dịch',
            subtitle: 'Hệ thống không thể đọc dữ liệu giao dịch. Liên hệ hỗ trợ nếu tiền đã bị trừ.',
            color: '#f59e0b',
        },
        pending_not_found: {
            icon: '⚠',
            iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
            iconShadow: '0 0 0 16px rgba(245,158,11,0.1)',
            title: 'Không tìm thấy đơn hàng',
            subtitle: 'Phiên đặt hàng đã hết hạn hoặc đã được xử lý trước đó.',
            color: '#f59e0b',
        },
        db_error: {
            icon: '✕',
            iconBg: 'linear-gradient(135deg, #ef4444, #dc2626)',
            iconShadow: '0 0 0 16px rgba(239,68,68,0.1)',
            title: 'Lỗi hệ thống',
            subtitle: 'Thanh toán thành công nhưng có lỗi khi lưu đơn hàng. Liên hệ hỗ trợ ngay.',
            color: '#ef4444',
        },
    };

    const info = statusInfo[resolvedStatus] || {
        ...statusInfo.failed,
        subtitle: resolvedStatus
            ? `Lỗi không xác định (${resolvedStatus}). Vui lòng thử lại hoặc liên hệ hỗ trợ.`
            : 'Không nhận được kết quả thanh toán. Vui lòng kiểm tra lịch sử đặt hàng.',
    };

    // Xóa giỏ hàng và trạng thái chỉnh sửa khi thanh toán thành công
    useEffect(() => {
        if (isSuccess) {
            clearCart();
            setEditingOrderId(null);
        }
    }, [isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto redirect về account sau 8 giây nếu thành công
    const [countdown, setCountdown] = useState(isSuccess ? 8 : null);
    useEffect(() => {
        if (!isSuccess) return;
        const t = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) { clearInterval(t); navigate('/account'); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [isSuccess, navigate]);

    // Capture the time once so it doesn't tick every second on re-render
    const [paymentTime] = useState(() => {
        const vnpPayDate = searchParams.get('vnp_PayDate');
        if (vnpPayDate && vnpPayDate.length === 14) {
            const y = vnpPayDate.substring(0, 4);
            const mo = vnpPayDate.substring(4, 6);
            const d = vnpPayDate.substring(6, 8);
            const h = vnpPayDate.substring(8, 10);
            const m = vnpPayDate.substring(10, 12);
            const s = vnpPayDate.substring(12, 14);
            return `${h}:${m}:${s} ${d}/${mo}/${y}`;
        }
        return new Date().toLocaleString('vi-VN');
    });

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '2rem', background: 'var(--bg)',
        }}>
            <div style={{ maxWidth: '520px', width: '100%', textAlign: 'center' }}>
                {/* Icon */}
                <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '90px', height: '90px', borderRadius: '50%',
                    background: info.iconBg, boxShadow: info.iconShadow,
                    fontSize: '2.5rem', color: '#fff', fontWeight: '800',
                    marginBottom: '1.5rem',
                }}>
                    {info.icon}
                </div>

                <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem', color: info.color }}>
                    {info.title}
                </h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '1rem' }}>
                    {info.subtitle}
                </p>

                {/* Chi tiết giao dịch */}
                {(amount || ref) && (
                    <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', textAlign: 'left', display: 'grid', gap: '0.75rem' }}>
                        {amount && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.65rem', borderBottom: '1px dashed var(--border)' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Số tiền</span>
                                <strong style={{ fontSize: '1.15rem', color: isSuccess ? '#10b981' : 'var(--text)' }}>{fmtMoney(amount)}</strong>
                            </div>
                        )}
                        {ref && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.65rem', borderBottom: '1px dashed var(--border)' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Mã giao dịch</span>
                                <code style={{ fontSize: '0.8rem', background: 'var(--surface-light)', padding: '0.2rem 0.5rem', borderRadius: '0.35rem' }}>{ref}</code>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Thời gian</span>
                            <strong style={{ fontSize: '0.9rem' }}>{paymentTime}</strong>
                        </div>
                    </div>
                )}

                {isSuccess && (
                    <div style={{
                        padding: '1rem 1.25rem', borderRadius: '0.75rem', marginBottom: '1.5rem',
                        background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)',
                        color: '#059669', fontSize: '0.9rem', textAlign: 'left',
                        display: 'grid', gap: '0.4rem',
                    }}>
                        {type === 'order_edit' && id_donHang && (
                            <div>Đơn hàng <strong>#{id_donHang}</strong> đã được cập nhật món mới thành công</div>
                        )}
                        {type !== 'order_edit' && id_donHang && <div>Đơn hàng <strong>#DH{id_donHang}</strong> đã được tạo và ghi nhận</div>}
                        {id_datBan && <div>Lịch đặt bàn <strong>#DB{id_datBan}</strong> đã xác nhận</div>}
                        {id_ban && <div>Bàn số <strong>{id_ban}</strong></div>}
                        <div>
                            {mode === 'bổ sung_đặt cọc'
                                ? 'Đã cọc thêm 10% phần tăng — phần còn lại thanh toán khi đến ăn'
                                : mode === 'bổ sung_toàn bộ'
                                    ? 'Đã thanh toán toàn bộ phần tăng thêm'
                                    : mode === 'supplement'
                                        ? 'Thanh toán bổ sung phần tăng thêm thành công'
                                        : mode === 'đặt cọc'
                                            ? 'Đã đặt cọc — phần còn lại thanh toán khi đến ăn'
                                            : 'Đã thanh toán toàn bộ — không cần trả thêm khi đến'}
                        </div>
                        {/* Gợi ý đặt món nếu chỉ đặt bàn thuần */}
                        {type === 'booking' && id_datBan && !id_donHang && (
                            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed rgba(16,185,129,0.3)', fontSize: '0.85rem' }}>
                                Ấn vào nút bên dưới để chọn món trước và không phải chờ khi tới nơi.
                            </div>
                        )}
                    </div>
                )}

                {/* Auto-redirect countdown */}
                {isSuccess && countdown !== null && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                        Tự động chuyển về trang tài khoản sau <strong>{countdown}</strong> giây...
                    </p>
                )}

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link to="/account" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        Xem tài khoản
                    </Link>
                    {/* Nếu đặt bàn thuần (không kèm món): gợi ý đặt món ngay */}
                    {isSuccess && type === 'booking' && id_datBan && !id_donHang && (
                        <Link
                            to={`/menu?reservationId=${id_datBan}&tableId=${id_ban || ''}`}
                            className="btn btn-primary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
                        >
                            🍽️ Chọn món ngay
                        </Link>
                    )}
                    {!isSuccess && (
                        <button onClick={() => navigate(-1)} className="btn btn-outline">
                            Thử lại
                        </button>
                    )}
                    <Link to="/menu" className="btn btn-outline">Về trang chủ</Link>
                </div>
            </div>
        </div>
    );
};

export default VNPayReturn;
