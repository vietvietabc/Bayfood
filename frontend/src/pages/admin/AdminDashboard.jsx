import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../utils/axiosSetup';
import {
  TrendingUp, TrendingDown, DollarSign, CalendarCheck,
  Users, Star, Clock, ChevronRight, RefreshCw,
  CheckCircle2, Loader2, AlertCircle
} from 'lucide-react';
import { StatCard, Skeleton } from './dashboard/StatCards';
import RevenueChart from './dashboard/RevenueChart';

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => n != null ? Number(n).toLocaleString('vi-VN') + ' ₫' : '—';
const fmtShort = (n) => {
  if (!n) return '0₫';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'tr';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k';
  return n + '₫';
};
const toVN = (d) => new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const todayStr = () => new Date().toISOString().slice(0, 10);

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

// ─── Status config ──────────────────────────────────────────────────────────
const ORDER_STATUS_COLOR = {
  'Đã thanh toán': { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  'Đang chờ món': { bg: 'rgba(249,115,22,0.12)', color: '#f97316' },
  'Đang chế biến': { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  'Chờ thanh toán': { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  'Chờ khách đến': { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6' },
  'Đã hủy': { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
};

const TABLE_STATUS_COLOR = {
  'Trống': { bg: 'rgba(16,185,129,0.18)', border: '#10b981', dot: '#10b981' },
  'Có khách': { bg: 'rgba(239,68,68,0.18)', border: '#ef4444', dot: '#ef4444' },
  'Đã đặt': { bg: 'rgba(245,158,11,0.18)', border: '#f59e0b', dot: '#f59e0b' },
  'Bảo trì': { bg: 'rgba(107,114,128,0.18)', border: '#6b7280', dot: '#6b7280' },
  'Đang dọn': { bg: 'rgba(99,102,241,0.18)', border: '#6366f1', dot: '#6366f1' },
};

const BOOKING_STATUS_COLOR = {
  'Chờ xác nhận': { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  'Đã xác nhận': { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  'Đã checkin': { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6' },
  'Đã hủy': { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  'Hoàn thành': { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  'Vắng mặt': { bg: 'rgba(239,68,68,0.2)', color: '#dc2626' },
};



// ─── Table Floor Mini ─────────────────────────────────────────────────────────
const TableFloorMini = ({ tables, loading }) => {
  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))', gap: '0.5rem' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} w="100%" h="52px" r="0.75rem" />
        ))}
      </div>
    );
  }

  const summary = tables.reduce((acc, t) => {
    acc[t.trangThai] = (acc[t.trangThai] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Summary pills */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {Object.entries(summary).map(([status, count]) => {
          const cfg = TABLE_STATUS_COLOR[status] || { bg: 'var(--surface-soft)', border: 'var(--muted)', dot: 'var(--muted)' };
          return (
            <div key={status} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.75rem', borderRadius: '999px', background: cfg.bg, border: `1px solid ${cfg.border}22`, fontSize: '0.72rem', fontWeight: 700 }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: cfg.dot }} />
              <span style={{ color: cfg.dot }}>{count}</span>
              <span style={{ color: 'var(--muted)' }}>{status}</span>
            </div>
          );
        })}
      </div>

      {/* Grid of tables */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '0.45rem' }}>
        {tables.map(t => {
          const cfg = TABLE_STATUS_COLOR[t.trangThai] || TABLE_STATUS_COLOR['Trống'];
          return (
            <div key={t.id_ban} title={`${t.tenBan} — ${t.trangThai}`} style={{
              borderRadius: '0.75rem', border: `1.5px solid ${cfg.border}44`,
              background: cfg.bg, padding: '0.5rem 0.25rem',
              textAlign: 'center', cursor: 'default',
              transition: 'transform 0.18s cubic-bezier(0.32,0.72,0,1)',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cfg.dot, margin: '0 auto 4px' }} />
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 2px' }}>
                {t.tenBan}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Activity Row ─────────────────────────────────────────────────────────────
const ActivityRow = ({ label, sub, badge, badgeCfg, time, accent }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '0.875rem',
    padding: '0.65rem 0', borderBottom: '1px solid var(--hairline)',
    transition: 'background 0.15s',
  }}>
    <div style={{ width: '36px', height: '36px', borderRadius: '0.625rem', background: accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, flexShrink: 0 }}>
      <CheckCircle2 size={16} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.1rem' }}>{sub}</div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', flexShrink: 0 }}>
      {badge && (
        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px', background: badgeCfg?.bg || 'var(--surface-soft)', color: badgeCfg?.color || 'var(--muted)', whiteSpace: 'nowrap' }}>
          {badge}
        </span>
      )}
      <span style={{ fontSize: '0.68rem', color: 'var(--muted-soft)' }}>{time}</span>
    </div>
  </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Inject shimmer keyframe once
  useEffect(() => {
    if (!document.getElementById('dash-shimmer')) {
      const s = document.createElement('style');
      s.id = 'dash-shimmer';
      s.textContent = `@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`;
      document.head.appendChild(s);
    }
  }, []);

  // Fetch all data
  useEffect(() => {
    let aborted = false;
    const fetchAll = async () => {
      if (refreshKey > 0) setRefreshing(true);
      else setLoading(true);

      const [ordRes, bookRes, userRes, revRes, tabRes] = await Promise.allSettled([
        api.get(`${BASE}/api/donhang/all/list`),
        api.get(`${BASE}/api/datban/all/list`),
        api.get(`${BASE}/api/users/all/list`),
        api.get(`${BASE}/api/danhgia/?type=general`),
        api.get(`${BASE}/api/ban/`),
      ]);

      if (aborted) return;

      if (ordRes.status === 'fulfilled') setOrders(ordRes.value.data || []);
      else console.warn('[Dashboard] orders failed:', ordRes.reason?.response?.status, ordRes.reason?.message);

      if (bookRes.status === 'fulfilled') setBookings(bookRes.value.data || []);
      else console.warn('[Dashboard] bookings failed:', bookRes.reason?.response?.status, bookRes.reason?.message);

      if (userRes.status === 'fulfilled') setUsers(userRes.value.data || []);
      else console.warn('[Dashboard] users failed:', userRes.reason?.response?.status, userRes.reason?.message);

      if (revRes.status === 'fulfilled') setReviews(revRes.value.data || []);
      else console.warn('[Dashboard] reviews failed:', revRes.reason?.response?.status, revRes.reason?.message);

      if (tabRes.status === 'fulfilled') setTables(tabRes.value.data || []);
      else console.warn('[Dashboard] tables failed:', tabRes.reason?.response?.status, tabRes.reason?.message);

      setLoading(false);
      setRefreshing(false);
    };
    fetchAll();
    return () => { aborted = true; };
  }, [refreshKey]);

  // ── Derived KPI metrics ──────────────────────────────────────────────────
  const today = todayStr();
  const stats = useMemo(() => {
    const paidOrders = orders.filter(o => o.tinhTrang === 'Đã thanh toán' || o.tinhTrang === 'Hoàn thành');
    const revenueToday = paidOrders
      .filter(o => (o.thoiGianTao || '').startsWith(today))
      .reduce((s, o) => s + Number(o.tongTien || 0), 0);
    const revenueYesterday = paidOrders
      .filter(o => {
        const d = new Date(); d.setDate(d.getDate() - 1);
        return (o.thoiGianTao || '').startsWith(d.toISOString().slice(0, 10));
      })
      .reduce((s, o) => s + Number(o.tongTien || 0), 0);

    const bookingsToday = bookings.filter(b => (b.thoiGianDen || '').startsWith(today)).length;
    const bookingsYest = bookings.filter(b => {
      const d = new Date(); d.setDate(d.getDate() - 1);
      return (b.thoiGianDen || '').startsWith(d.toISOString().slice(0, 10));
    }).length;

    const customers = users.filter(u => u.tenVaiTro === 'Khách hàng' || u.id_vaiTro === 1).length;
    const avgRating = reviews.length ? (reviews.reduce((s, r) => s + Number(r.soSao || 0), 0) / reviews.length) : 0;

    const revDiff = revenueYesterday ? ((revenueToday - revenueYesterday) / revenueYesterday * 100) : null;
    const bookDiff = bookingsYest ? ((bookingsToday - bookingsYest) / bookingsYest * 100) : null;

    return { revenueToday, revenueYesterday, revDiff, bookingsToday, bookDiff, customers, avgRating };
  }, [orders, bookings, users, reviews, today]);

  // ── 7-day revenue data ───────────────────────────────────────────────────
  const data7d = useMemo(() => {
    const map = {};
    const days = getLast7Days();
    days.forEach(d => { map[d] = 0; });
    orders
      .filter(o => o.tinhTrang === 'Đã thanh toán' || o.tinhTrang === 'Hoàn thành')
      .forEach(o => {
        const d = (o.thoiGianTao || '').slice(0, 10);
        if (d in map) map[d] += Number(o.tongTien || 0);
      });
    return map;
  }, [orders]);

  // ── Recent activity lists ────────────────────────────────────────────────
  const recentBookings = useMemo(() =>
    [...bookings].slice(0, 6),
    [bookings]);

  const activeOrders = useMemo(() =>
    orders
      .filter(o => !['Đã thanh toán', 'Đã hủy', 'Vắng mặt'].includes(o.tinhTrang))
      .slice(0, 6),
    [orders]);

  // ── Table status summary ─────────────────────────────────────────────────
  const tableStats = useMemo(() => ({
    total: tables.length,
    trong: tables.filter(t => t.trangThai === 'Trống').length,
    coKhach: tables.filter(t => t.trangThai === 'Có khách').length,
    daDat: tables.filter(t => t.trangThai === 'Đã đặt').length,
  }), [tables]);

  // ── Time greeting ────────────────────────────────────────────────────────
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  const nowVN = new Date().toLocaleString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.3rem' }}>
            {nowVN}
          </p>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em', margin: 0, lineHeight: 1.1 }}>
            {greeting}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Đây là tổng quan hoạt động của BayFood hôm nay.
          </p>
        </div>

        <button
          onClick={() => setRefreshKey(k => k + 1)}
          disabled={refreshing || loading}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.55rem 1.1rem', borderRadius: '0.75rem',
            border: '1px solid var(--hairline)', background: 'var(--surface-card)',
            color: 'var(--muted)', fontSize: '0.8rem', fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.32,0.72,0,1)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--hairline)'; e.currentTarget.style.color = 'var(--muted)'; }}
        >
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          {refreshing ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {/* ── 4 KPI Stat Cards ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <StatCard
          title="Doanh thu hôm nay"
          value={fmtShort(stats.revenueToday)}
          sub={stats.revenueToday ? `${fmt(stats.revenueToday)}` : 'Chưa có đơn'}
          icon={<DollarSign size={20} />}
          accent="#f97316"
          loading={loading}
          trend={stats.revDiff != null ? `${stats.revDiff > 0 ? '+' : ''}${stats.revDiff.toFixed(0)}% vs hôm qua` : null}
          trendUp={stats.revDiff >= 0}
        />
        <StatCard
          title="Đặt bàn hôm nay"
          value={stats.bookingsToday}
          sub={`${bookings.filter(b => b.trangThai === 'Chờ xác nhận').length} chờ xác nhận`}
          icon={<CalendarCheck size={20} />}
          accent="#3b82f6"
          loading={loading}
          trend={stats.bookDiff != null ? `${stats.bookDiff > 0 ? '+' : ''}${stats.bookDiff.toFixed(0)}% vs hôm qua` : null}
          trendUp={stats.bookDiff >= 0}
        />
        <StatCard
          title="Khách hàng"
          value={stats.customers}
          sub={`${users.length} tổng tài khoản`}
          icon={<Users size={20} />}
          accent="#8b5cf6"
          loading={loading}
        />
        <StatCard
          title="Đánh giá trung bình"
          value={reviews.length ? `${stats.avgRating.toFixed(1)} ★` : '—'}
          sub={`${reviews.length} đánh giá chung`}
          icon={<Star size={20} />}
          accent="#f59e0b"
          loading={loading}
        />
      </div>

      {/* ── Chart + Tables row ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem' }}>

        {/* Revenue chart card */}
        <div style={{
          background: 'var(--surface-card)', border: '1px solid var(--hairline)',
          borderRadius: '1.25rem', padding: '1.5rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.2rem' }}>
                Doanh thu 7 ngày
              </p>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                {loading ? <Skeleton w="100px" h="1.5rem" r="0.4rem" /> : fmtShort(Object.values(data7d).reduce((a, b) => a + b, 0))}
              </div>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 700, padding: '0.3rem 0.75rem', borderRadius: '999px', background: 'rgba(249,115,22,0.1)', color: '#f97316' }}>
              <TrendingUp size={11} /> 7 ngày gần đây
            </div>
          </div>
          <RevenueChart data7d={data7d} loading={loading} fmtShort={fmtShort} getLast7Days={getLast7Days} todayStr={todayStr} />
        </div>

        {/* Table status card */}
        <div style={{
          background: 'var(--surface-card)', border: '1px solid var(--hairline)',
          borderRadius: '1.25rem', padding: '1.5rem',
          display: 'flex', flexDirection: 'column', gap: '1rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.2rem' }}>
                Sơ đồ bàn
              </p>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                {loading ? <Skeleton w="60px" h="1.5rem" r="0.4rem" /> : `${tableStats.coKhach}/${tableStats.total}`}
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textAlign: 'right', lineHeight: 1.5 }}>
              {loading ? null : <>
                <div><span style={{ color: '#ef4444', fontWeight: 700 }}>{tableStats.coKhach}</span> có khách</div>
                <div><span style={{ color: '#f59e0b', fontWeight: 700 }}>{tableStats.daDat}</span> đã đặt</div>
                <div><span style={{ color: '#10b981', fontWeight: 700 }}>{tableStats.trong}</span> trống</div>
              </>}
            </div>
          </div>
          <TableFloorMini tables={tables} loading={loading} />
        </div>
      </div>

      {/* ── Activity Feed 2-col ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

        {/* Recent bookings */}
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline)', borderRadius: '1.25rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.2rem' }}>
                Đặt bàn mới nhất
              </p>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                {loading ? <Skeleton w="60px" h="1.1rem" r="0.3rem" /> : `${bookings.length} tổng`}
              </div>
            </div>
            <a href="/admin/reservations" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              Xem tất cả <ChevronRight size={13} />
            </a>
          </div>

          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.65rem 0', borderBottom: '1px solid var(--hairline)', alignItems: 'center' }}>
                <Skeleton w="36px" h="36px" r="0.625rem" />
                <div style={{ flex: 1 }}><Skeleton w="70%" h="0.8rem" r="0.3rem" style={{ marginBottom: '0.4rem' }} /><Skeleton w="50%" h="0.7rem" r="0.3rem" /></div>
              </div>
            ))
            : recentBookings.length === 0
              ? <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>Chưa có đặt bàn</div>
              : recentBookings.map((b) => {
                const cfg = BOOKING_STATUS_COLOR[b.trangThai] || { bg: 'var(--surface-soft)', color: 'var(--muted)' };
                return (
                  <ActivityRow
                    key={b.id_datBan}
                    label={b.tenKhachHang || `Khách #${b.id_nguoiDung}`}
                    sub={`${b.tenBan || 'Chưa xếp bàn'} · ${b.soNguoi} người`}
                    badge={b.trangThai}
                    badgeCfg={cfg}
                    time={toVN(b.thoiGianDen)}
                    accent="#3b82f6"
                  />
                );
              })
          }
        </div>

        {/* Active orders */}
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline)', borderRadius: '1.25rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.2rem' }}>
                Đơn hàng đang xử lý
              </p>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                {loading ? <Skeleton w="60px" h="1.1rem" r="0.3rem" /> : `${activeOrders.length} đơn`}
              </div>
            </div>
            <a href="/admin/orders" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              Xem tất cả <ChevronRight size={13} />
            </a>
          </div>

          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.65rem 0', borderBottom: '1px solid var(--hairline)', alignItems: 'center' }}>
                <Skeleton w="36px" h="36px" r="0.625rem" />
                <div style={{ flex: 1 }}><Skeleton w="70%" h="0.8rem" r="0.3rem" style={{ marginBottom: '0.4rem' }} /><Skeleton w="50%" h="0.7rem" r="0.3rem" /></div>
              </div>
            ))
            : activeOrders.length === 0
              ? <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
                <CheckCircle2 size={32} style={{ opacity: 0.25, display: 'block', margin: '0 auto 0.5rem' }} />
                Không có đơn đang xử lý
              </div>
              : activeOrders.map((o) => {
                const cfg = ORDER_STATUS_COLOR[o.tinhTrang] || { bg: 'var(--surface-soft)', color: 'var(--muted)' };
                return (
                  <ActivityRow
                    key={o.id_donHang}
                    label={o.tenKhachHang || `Đơn #${o.id_donHang}`}
                    sub={`${o.tenBan ? o.tenBan : o.id_ban ? `Bàn ${o.id_ban}` : 'Mang về'} · ${o.tinhTrang}`}
                    badge={fmtShort(o.tongTien)}
                    badgeCfg={{ bg: 'rgba(249,115,22,0.1)', color: '#f97316' }}
                    time={toVN(o.thoiGianTao)}
                    accent="#f97316"
                  />
                );
              })
          }
        </div>
      </div>

      {/* spin keyframe */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default AdminDashboard;
