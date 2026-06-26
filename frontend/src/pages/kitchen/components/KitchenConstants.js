export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const ITEM_STATUS_FLOW = ['Chờ chế biến', 'Đang chế biến', 'Hoàn thành'];

export const getItemStatusStyle = (status) => {
    switch (status) {
        case 'Chờ chế biến':
            return { bg: 'rgba(234, 179, 8, 0.12)', color: '#ca8a04', border: '1px solid rgba(234,179,8,0.3)', label: 'Chờ chế biến' };
        case 'Đang chế biến':
            return { bg: 'rgba(249, 115, 22, 0.12)', color: '#ea580c', border: '1px solid rgba(94,106,210,0.3)', label: 'Đang chế biến' };
        case 'Hoàn thành':
            return { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)', label: 'Hoàn thành' };
        default:
            return { bg: 'var(--surface-soft)', color: 'var(--muted)', border: '1px solid var(--hairline)', label: status };
    }
};

export const getOrderStatusStyle = (status) => {
    switch (status) {
        case 'Đang chờ món': return { bg: 'rgba(234,179,8,0.12)', color: '#ca8a04' };
        case 'Đang chế biến': return { bg: 'rgba(94,106,210,0.12)', color: '#ea580c' };
        default: return { bg: 'var(--surface-soft)', color: 'var(--muted)' };
    }
};

export const formatTime = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

export const getElapsedMinutes = (thoiGianTao) => {
    if (!thoiGianTao) return 0;
    return Math.floor((Date.now() - new Date(thoiGianTao).getTime()) / 60000);
};
