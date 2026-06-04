import React, { useState, useEffect, useMemo } from 'react';
import api from '../../utils/axiosSetup';
import { Trash2, Star, User, Search, TrendingUp, MessageSquare } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReviews = async () => {
    try {
      // Chỉ lấy đánh giá chung (id_monAn IS NULL)
      const response = await api.get(`${BASE_URL}/api/danhgia/?type=general`);
      setReviews(response.data);
    } catch (error) {
      console.error('Lỗi tải danh sách đánh giá', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa đánh giá này không? Hành động này không thể hoàn tác.")) {
      try {
        await api.delete(`${BASE_URL}/api/danhgia/${id}`);
        fetchReviews();
      } catch (error) {
        alert(error.response?.data?.detail || "Có lỗi xảy ra khi xóa đánh giá");
      }
    }
  };

  const renderStars = (rating, size = 16) => {
    return [...Array(5)].map((_, index) => (
      <Star
        key={index}
        size={size}
        fill={index < rating ? "#f59e0b" : "transparent"}
        color={index < rating ? "#f59e0b" : "#d1d5db"}
      />
    ));
  };

  // Stats computed
  const stats = useMemo(() => {
    if (!reviews.length) return { avg: 0, count: 0, distribution: [0, 0, 0, 0, 0] };
    const total = reviews.reduce((sum, r) => sum + r.soSao, 0);
    const avg = total / reviews.length;
    const distribution = [5, 4, 3, 2, 1].map(star =>
      reviews.filter(r => r.soSao === star).length
    );
    return { avg, count: reviews.length, distribution };
  }, [reviews]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    if (!searchQuery.trim()) return reviews;
    const q = searchQuery.toLowerCase();
    return reviews.filter(r =>
      (r.tenKhachHang || '').toLowerCase().includes(q) ||
      (r.noiDung || '').toLowerCase().includes(q) ||
      String(r.id_donHang).includes(q)
    );
  }, [reviews, searchQuery]);

  const avgFormatted = stats.avg.toFixed(1);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0, marginBottom: '0.25rem' }}>Đánh giá chung</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Đánh giá tổng thể của khách về nhà hàng (không bao gồm đánh giá từng món ăn)
          </p>
        </div>
      </div>

      {/* Stats Row */}
      {!loading && reviews.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {/* Big avg */}
          <div className="card" style={{
            padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minWidth: '160px', gap: '0.5rem', textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(249,115,22,0.06))',
            border: '1px solid rgba(245,158,11,0.25)'
          }}>
            <div style={{ fontSize: '3.2rem', fontWeight: '800', color: '#f59e0b', lineHeight: 1 }}>{avgFormatted}</div>
            <div style={{ display: 'flex', gap: '3px' }}>{renderStars(Math.round(stats.avg), 20)}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {stats.count} đánh giá
            </div>
          </div>

          {/* Star distribution */}
          <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.5rem' }}>
            {[5, 4, 3, 2, 1].map((star, i) => {
              const count = stats.distribution[i];
              const pct = stats.count > 0 ? Math.round((count / stats.count) * 100) : 0;
              return (
                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', minWidth: '60px', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>{star}</span>
                    <Star size={13} fill="#f59e0b" color="#f59e0b" />
                  </div>
                  <div style={{ flex: 1, height: '8px', background: 'var(--surface-light)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%',
                      background: star >= 4 ? '#f59e0b' : star === 3 ? '#fb923c' : '#ef4444',
                      borderRadius: '4px', transition: 'width 0.6s ease'
                    }} />
                  </div>
                  <div style={{ minWidth: '50px', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {count} ({pct}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.25rem', maxWidth: '420px' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Tìm theo tên khách, nội dung, mã đơn..."
          style={{
            width: '100%', padding: '0.6rem 0.85rem 0.6rem 2.4rem',
            borderRadius: '0.5rem', border: '1px solid var(--border)',
            background: 'var(--surface-light)', color: 'var(--text-main)',
            fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải dữ liệu đánh giá...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-light)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>ID</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Khách Hàng</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Đơn Hàng</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Số Sao</th>
                <th style={{ padding: '1rem', fontWeight: 'bold', width: '40%' }}>Nội Dung</th>
                <th style={{ padding: '1rem', fontWeight: 'bold', textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews.map(review => (
                <tr key={review.id_danhGia} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    #{review.id_danhGia}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%', background: '#6366f1',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.85rem', flexShrink: 0
                      }}>
                        {(review.tenKhachHang || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          {review.tenKhachHang || `Khách #${review.id_nguoiDung}`}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ID: {review.id_nguoiDung}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                    #{review.id_donHang}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                      {renderStars(review.soSao)}
                      <span style={{ marginLeft: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b' }}>
                        {review.soSao}/5
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {review.noiDung ? (
                      <span style={{ color: 'var(--text-main)', lineHeight: 1.5, fontSize: '0.9rem' }}>
                        "{review.noiDung}"
                      </span>
                    ) : (
                      <i style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Không có nội dung</i>
                    )}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(review.id_danhGia)}
                      style={{
                        padding: '0.5rem 1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                        border: 'none', borderRadius: '0.5rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto',
                        fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                    >
                      <Trash2 size={15} /> Gỡ Bỏ
                    </button>
                  </td>
                </tr>
              ))}
              {filteredReviews.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <MessageSquare size={40} style={{ opacity: 0.3, marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
                    {searchQuery ? 'Không tìm thấy đánh giá phù hợp.' : 'Chưa có đánh giá chung nào từ khách hàng.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminReviews;
