import React, { useState, useEffect } from 'react';
import api from '../../utils/axiosSetup';
import { Trash2, Star, User } from 'lucide-react';

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      const response = await api.get('http://localhost:8000/api/danhgia');
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
        await api.delete(`http://localhost:8000/api/danhgia/${id}`);
        fetchReviews();
      } catch (error) {
        alert(error.response?.data?.detail || "Có lỗi xảy ra khi xóa đánh giá");
      }
    }
  };

  // Hàm render số sao (Star rating)
  const renderStars = (rating) => {
    return [...Array(5)].map((_, index) => (
      <Star
        key={index}
        size={16}
        fill={index < rating ? "#f59e0b" : "transparent"}
        color={index < rating ? "#f59e0b" : "#d1d5db"}
      />
    ));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Cập nhật đánh giá</h1>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải dữ liệu đánh giá...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-light)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>ID Đánh Giá</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Mã KH</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Đơn Hàng</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Số Sao</th>
                <th style={{ padding: '1rem', fontWeight: 'bold', width: '35%' }}>Nội Dung</th>
                <th style={{ padding: '1rem', fontWeight: 'bold', textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map(review => (
                <tr key={review.id_danhGia} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>#{review.id_danhGia}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <User size={16} color="var(--text-muted)" />
                      KH{review.id_nguoiDung}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                    #{review.id_donHang}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {renderStars(review.soSao)}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                    {review.noiDung || <i style={{ color: '#9ca3af' }}>Không có nội dung</i>}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(review.id_danhGia)}
                      style={{ padding: '0.5rem 1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}
                    >
                      <Trash2 size={16} /> Gỡ Bỏ
                    </button>
                  </td>
                </tr>
              ))}
              {reviews.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Chưa có đánh giá nào từ khách hàng.
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
