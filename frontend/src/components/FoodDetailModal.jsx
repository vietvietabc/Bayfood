import React, { useState, useEffect } from 'react';
import axios from '../utils/axiosSetup';
import { X, Plus, Star, StarHalf } from 'lucide-react';
import { useCart } from '../context/CartContext';

const FoodDetailModal = ({ item, onClose }) => {
  const { addToCart } = useCart();
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  const defaultImage = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`;
  const imageUrl = item.hinhAnh || defaultImage;

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoadingReviews(true);
        // Lấy 10 đánh giá mới nhất
        const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');
        const response = await axios.get(`${apiUrl}/api/thucdon/${item.id_monAn}/danhgia?limit=10`);
        setReviews(response.data);
      } catch (error) {
        console.error("Error fetching reviews:", error);
      } finally {
        setLoadingReviews(false);
      }
    };

    if (item?.id_monAn) {
      fetchReviews();
    }
  }, [item]);

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(<Star key={i} size={16} fill="var(--warning)" color="var(--warning)" />);
      } else {
        stars.push(<Star key={i} size={16} color="var(--hairline)" />);
      }
    }
    return stars;
  };

  if (!item) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--rounded-xl)',
          width: '100%',
          maxWidth: '800px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'rgba(0,0,0,0.5)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
          {/* Phần thông tin món ăn */}
          <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px', minHeight: '250px' }}>
              <img
                src={imageUrl}
                alt={item.tenMon}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ flex: '1 1 300px', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1rem' }}>{item.tenMon}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '1.5rem', lineHeight: '1.6', flexGrow: 1 }}>
                {item.moTa || 'Món ăn thơm ngon chuẩn vị BayFood, được chế biến từ những nguyên liệu tươi ngon nhất.'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                  {Number(item.giaTien).toLocaleString('vi-VN')} đ
                </span>
                <button
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: 'var(--rounded-full)' }}
                  onClick={() => {
                    addToCart(item);
                    onClose(); // Optional: close modal after adding to cart
                  }}
                >
                  <Plus size={20} /> Thêm vào giỏ
                </button>
              </div>
            </div>
          </div>

          {/* Phần Đánh giá */}
          <div style={{ padding: '2rem', borderTop: '1px solid var(--hairline)', backgroundColor: 'var(--surface-card)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Đánh giá từ khách hàng</h3>

            {loadingReviews ? (
              // Skeleton Loading
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ padding: '1rem', borderRadius: 'var(--rounded-lg)', border: '1px solid var(--hairline)', animation: 'pulse 1.5s infinite' }}>
                    <div style={{ height: '20px', backgroundColor: 'var(--hairline)', width: '30%', marginBottom: '0.5rem', borderRadius: '4px' }}></div>
                    <div style={{ height: '16px', backgroundColor: 'var(--hairline)', width: '80%', borderRadius: '4px' }}></div>
                  </div>
                ))}
              </div>
            ) : reviews.length > 0 ? (
              // Hiển thị danh sách đánh giá
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {reviews.map((review) => (
                  <div key={review.id_danhGia} style={{ padding: '1rem', borderRadius: 'var(--rounded-lg)', border: '1px solid var(--hairline)', backgroundColor: 'var(--surface)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: '600' }}>{review.tenNguoiDung}</span>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {renderStars(review.soSao)}
                      </div>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                      {review.noiDung || <span style={{ fontStyle: 'italic', opacity: 0.7 }}>(Không có nhận xét)</span>}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              // Empty State
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--muted)', background: 'var(--surface)', borderRadius: 'var(--rounded-lg)', border: '1px dashed var(--hairline)' }}>
                <Star size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p style={{ margin: 0 }}>Chưa có đánh giá nào cho món ăn này.</p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Hãy là người đầu tiên thưởng thức và để lại đánh giá nhé!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FoodDetailModal;
