import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, CalendarDays, DollarSign, TrendingUp } from 'lucide-react';

const StatCard = ({ title, value, icon, trend }) => (
  <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{title}</p>
      <h3 style={{ fontSize: '1.75rem', margin: 0 }}>{value}</h3>
      {trend && <p style={{ color: 'var(--secondary)', fontSize: '0.75rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><TrendingUp size={12} /> {trend}</p>}
    </div>
    <div style={{ padding: '1rem', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)', borderRadius: '0.75rem' }}>
      {icon}
    </div>
  </div>
);

const AdminDashboard = () => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Tổng Quan Quản Trị</h1>
      </div>

      <div className="grid grid-cols-4 gap-6" style={{ marginBottom: '2rem' }}>
        <StatCard title="Tổng Doanh Thu" value="12,500,000đ" icon={<DollarSign size={24} />} trend="+15% so với tuần trước" />
        <StatCard title="Đơn Đặt Bàn Mới" value="18" icon={<CalendarDays size={24} />} trend="+3 hôm nay" />
        <StatCard title="Khách Hàng" value="256" icon={<Users size={24} />} trend="+12 khách mới" />
        <StatCard title="Đánh Giá" value="4.8/5" icon={<TrendingUp size={24} />} />
      </div>

      <div className="card" style={{ padding: '1.5rem', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Biểu đồ doanh thu sẽ được hiển thị ở đây (Đang phát triển)</p>
      </div>
    </div>
  );
};

export default AdminDashboard;
