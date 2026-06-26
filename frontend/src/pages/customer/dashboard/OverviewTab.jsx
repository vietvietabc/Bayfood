import React from 'react';
import { ClipboardList, MapPin, UserCircle2 } from 'lucide-react';

const OverviewTab = ({ user, orders, reservations, activeOrders, activeReservations }) => (
    <div className="cd-stats-grid">
        <div className="cd-stat-card">
            <div className="cd-stat-header">
                <div className="cd-stat-icon cd-stat-icon--orders"><ClipboardList size={20} /></div>
                <span className="cd-stat-label">Đơn món</span>
            </div>
            <div className="cd-stat-value">{orders.length}</div>
            <div className="cd-stat-sub">{activeOrders} đơn đang xử lý</div>
        </div>
        <div className="cd-stat-card">
            <div className="cd-stat-header">
                <div className="cd-stat-icon cd-stat-icon--reservations"><MapPin size={20} /></div>
                <span className="cd-stat-label">Đặt bàn</span>
            </div>
            <div className="cd-stat-value">{reservations.length}</div>
            <div className="cd-stat-sub">{activeReservations} đang chờ hoặc xác nhận</div>
        </div>
        <div className="cd-stat-card">
            <div className="cd-stat-header">
                <div className="cd-stat-icon cd-stat-icon--account"><UserCircle2 size={20} /></div>
                <span className="cd-stat-label">Tài khoản</span>
            </div>
            <div className="cd-stat-value" style={{ fontSize: '1.15rem' }}>{user.tenVaiTro || 'Khách hàng'}</div>
            <div className="cd-stat-sub">{user.soDienThoai || 'Chưa cập nhật SĐT'}</div>
        </div>
    </div>
);

export default OverviewTab;
