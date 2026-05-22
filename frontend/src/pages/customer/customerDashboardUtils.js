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
        'Chờ xác nhận': { bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' },
        'Đã đặt': { bg: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa' },
        'Đã xác nhận': { bg: 'rgba(52, 211, 153, 0.15)', color: '#34d399' },
        'Đã checkin': { bg: 'rgba(192, 132, 252, 0.15)', color: '#c084fc' },
        'Hoàn thành': { bg: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa' },
        'Đã hủy': { bg: 'rgba(248, 113, 113, 0.15)', color: '#f87171' },
        'Vắng mặt': { bg: 'rgba(248, 113, 113, 0.18)', color: '#f87171' },
        'Chờ khách đến': { bg: 'rgba(251, 146, 60, 0.15)', color: '#fb923c' },
        'Đang chờ món': { bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' },
        'Đang chế biến': { bg: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa' },
        'Đã phục vụ': { bg: 'rgba(192, 132, 252, 0.15)', color: '#c084fc' },
        'Đã thanh toán': { bg: 'rgba(52, 211, 153, 0.15)', color: '#34d399' },
    };
    return mapping[status] || { bg: 'var(--surface-light)', color: 'var(--text-muted)' };
};
