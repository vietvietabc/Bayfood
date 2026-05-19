export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const formatDateTime = (value) => {
    if (!value) return 'Chưa cập nhật';
    return new Date(value).toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

const currencyFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
export const formatCurrency = (amount) => currencyFormatter.format(amount || 0);

export const getMonStatusColor = (status) => {
    switch (status) {
        case 'Chờ chế biến': return '#eab308';
        case 'Đang chế biến': return '#3b82f6';
        case 'Hoàn thành': return '#10b981';
        default: return 'var(--text-muted)';
    }
};

export const getStatusStyle = (status) => {
    const mapping = {
        'Chờ xác nhận': { bg: 'rgba(234, 179, 8, 0.12)', color: '#ca8a04' },
        'Đã đặt': { bg: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' },
        'Đã xác nhận': { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669' },
        'Đã checkin': { bg: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed' },
        'Hoàn thành': { bg: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' },
        'Đã hủy': { bg: 'rgba(239, 68, 68, 0.12)', color: '#dc2626' },
        'Vắng mặt': { bg: 'rgba(239, 68, 68, 0.18)', color: '#dc2626' },
        'Chờ khách đến': { bg: 'rgba(249, 115, 22, 0.12)', color: '#ea580c' },
        'Đang chờ món': { bg: 'rgba(234, 179, 8, 0.12)', color: '#ca8a04' },
        'Đang chế biến': { bg: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' },
        'Đã phục vụ': { bg: 'rgba(168, 85, 247, 0.12)', color: '#7c3aed' },
        'Đã thanh toán': { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669' },
    };
    return mapping[status] || { bg: 'var(--surface-light)', color: 'var(--text-muted)' };
};
