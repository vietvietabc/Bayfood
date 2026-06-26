// ============================================================
// WaiterConstants.js - Hằng số, utility functions, StatusBadge
// ============================================================

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const STATUS_FLOW = ['Đang chờ món', 'Đang chế biến', 'Đã phục vụ', 'Đã thanh toán'];

export const formatTime = (v) => !v ? '-' : new Date(v).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
export const formatDate = (v) => !v ? '-' : new Date(v).toLocaleString('vi-VN');
export const getElapsedMinutes = (t) => !t ? 0 : Math.floor((Date.now() - new Date(t).getTime()) / 60000);
export const fmtMoney = (v) => v != null ? Number(v).toLocaleString('vi-VN') + ' ₫' : '0 ₫';

export const STATUS_STYLE = {
    'Đang chờ món': { bg: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.35)', color: '#fbbf24', dot: '#f59e0b' },
    'Đang chế biến': { bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.35)', color: '#fb923c', dot: '#f97316' },
    'Đã phục vụ': { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.35)', color: '#34d399', dot: '#10b981' },
    'Đã thanh toán': { bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.35)', color: '#c084fc', dot: '#a855f7' },
};

export const ITEM_STATUS_STYLE = {
    'Chờ chế biến': { color: '#fbbf24', bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.25)' },
    'Đang chế biến': { color: '#fb923c', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.25)' },
    'Hoàn thành': { color: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' },
};

import React from 'react';

export const StatusBadge = ({ status }) => {
    const s = STATUS_STYLE[status] || { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', dot: '#888' };
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: 'var(--rounded-pill)', background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontSize: '0.75rem', fontWeight: '700' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
            {status}
        </span>
    );
};
