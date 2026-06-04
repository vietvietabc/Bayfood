import React, { useState, useEffect } from 'react';
import axios from '../../utils/axiosSetup';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Minus, 
  Star, 
  ShoppingCart, 
  Clock, 
  Users, 
  ShieldCheck, 
  Heart, 
  Sparkles, 
  MessageSquare,
  ThumbsUp
} from 'lucide-react';
import { useCart } from '../../context/CartContext';

const FoodDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isLoved, setIsLoved] = useState(false);

  useEffect(() => {
    const fetchFoodDetail = async () => {
      try {
        setLoading(true);
        const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');
        const [foodRes, reviewRes] = await Promise.all([
          axios.get(`${apiUrl}/api/thucdon/${id}/chi-tiet`),
          axios.get(`${apiUrl}/api/thucdon/${id}/danhgia?limit=10`)
        ]);
        setItem(foodRes.data);
        setReviews(reviewRes.data);
      } catch (error) {
        console.error("Error fetching food detail:", error);
      } finally {
        setLoading(false);
        setLoadingReviews(false);
      }
    };

    if (id) {
      fetchFoodDetail();
    }
  }, [id]);

  const renderStars = (rating, size = 16) => {
    const stars = [];
    const floorRating = Math.floor(rating);
    for (let i = 1; i <= 5; i++) {
      if (i <= floorRating) {
        stars.push(<Star key={i} size={size} fill="#fbbf24" color="#fbbf24" />);
      } else {
        stars.push(<Star key={i} size={size} color="var(--hairline)" />);
      }
    }
    return stars;
  };

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart(item);
    }
    alert(`Đã thêm ${quantity} phần ${item.tenMon} vào giỏ hàng`);
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ width: '50px', height: '50px', border: '4px solid var(--hairline)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.75rem', color: 'var(--text-muted)' }}>Không tìm thấy món ăn</h2>
        <p style={{ marginTop: '0.5rem', color: 'var(--muted)' }}>Món ăn này có thể đã ngừng phục vụ hoặc ID không hợp lệ.</p>
        <button className="btn btn-outline" style={{ marginTop: '1.5rem', borderRadius: 'var(--rounded-md)' }} onClick={() => navigate('/menu')}>Quay lại thực đơn</button>
      </div>
    );
  }

  const defaultImage = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=90`;
  const imageUrl = item.hinhAnh || defaultImage;

  // Tính điểm đánh giá trung bình
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.soSao, 0) / reviews.length).toFixed(1)
    : "4.8";

  // Hàm tính phần trăm sao
  const getRatingPercentage = (stars) => {
    if (reviews.length === 0) {
      if (stars === 5) return 80;
      if (stars === 4) return 20;
      return 0;
    }
    const count = reviews.filter(r => r.soSao === stars).length;
    return Math.round((count / reviews.length) * 100);
  };

  return (
    <div style={{ background: 'var(--canvas)', minHeight: '100vh', position: 'relative' }}>
      {/* Full-width Hero Banner with vertical fade-out overlay */}
      <div style={{ 
        backgroundImage: `url(${imageUrl})`, 
        height: '420px', 
        backgroundSize: 'cover', 
        backgroundPosition: 'center', 
        position: 'relative',
        width: '100%'
      }}>
        {/* Dark vignette and canvas fade-out gradient */}
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          background: 'linear-gradient(to bottom, rgba(14,15,17,0.1) 0%, rgba(14,15,17,0.45) 70%, var(--canvas) 100%)', 
          zIndex: 1 
        }}></div>

        {/* Floating back button & breadcrumb inside a centered container */}
        <div className="container" style={{ 
          position: 'relative', 
          zIndex: 2, 
          paddingTop: '2.5rem', 
          maxWidth: '1240px',
          margin: '0 auto',
          paddingLeft: '1.5rem',
          paddingRight: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <button
              onClick={() => navigate('/menu')}
              className="btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#fff',
                padding: '0.6rem 1.25rem',
                borderRadius: 'var(--rounded-lg)',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.18)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--glass-bg)';
                e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <ArrowLeft size={18} /> Quay lại thực đơn
            </button>
          </div>
        </div>
      </div>

      {/* Floating Interactive Detail Card & Reviews Area */}
      <div className="container" style={{ 
        padding: '0 1.5rem 4rem 1.5rem', 
        maxWidth: '1240px', 
        margin: '0 auto',
        marginTop: '-180px', 
        position: 'relative', 
        zIndex: 10 
      }}>
        {/* Main Food Showcase Box */}
        <div className="card" style={{ 
          overflow: 'hidden', 
          padding: 0, 
          border: '1px solid rgba(255, 255, 255, 0.08)', 
          background: 'var(--glass-bg)', 
          backdropFilter: 'blur(24px)', 
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.45)', 
          marginBottom: '3rem',
          borderRadius: 'var(--rounded-xl)'
        }}>
          <div style={{ display: 'block' }}>
            
            {/* Thông tin món ăn chi tiết */}
            <div style={{ padding: '3.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                {/* Badges */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'inline-flex', padding: '0.3rem 0.9rem', background: 'rgba(249, 115, 22, 0.08)', border: '1px solid rgba(249, 115, 22, 0.2)', color: 'var(--primary)', borderRadius: 'var(--rounded-pill)', fontSize: '0.8rem', fontWeight: '800', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                    Món ăn đặc sản
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.8rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', borderRadius: 'var(--rounded-pill)', fontSize: '0.8rem', fontWeight: '800', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                    <ShieldCheck size={13} /> Tươi Sạch
                  </div>
                  {reviews.length > 5 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.8rem', background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.2)', color: '#f97316', borderRadius: 'var(--rounded-pill)', fontSize: '0.8rem', fontWeight: '800', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                      <Sparkles size={13} /> Bán Chạy
                    </div>
                  )}
                </div>

                {/* Title */}
                <h1 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '1rem', letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: '1.1' }}>{item.tenMon}</h1>

                {/* Ratings Quick view */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {renderStars(Number(avgRating), 16)}
                  </div>
                  <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--ink)' }}>{avgRating}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>|</span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MessageSquare size={14} /> {reviews.length} đánh giá khách hàng
                  </span>
                </div>

                {/* Description */}
                <p style={{ color: 'var(--text-muted)', fontSize: '1.15rem', marginBottom: '2.25rem', lineHeight: '1.75' }}>
                  {item.moTa || 'Món ăn thơm ngon chuẩn vị BayFood, được chế biến từ những nguyên liệu tươi ngon hữu cơ nhất bởi đội ngũ đầu bếp nghệ nhân giàu kinh nghiệm, đảm bảo mang tới hương vị trọn vẹn và an toàn vệ sinh thực phẩm.'}
                </p>

                {/* Specs Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem', padding: '1.25rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--rounded-lg)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Clock size={20} color="var(--primary)" />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: '600' }}>Thời gian chuẩn bị</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--ink)' }}>15 - 25 phút</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Users size={20} color="var(--primary)" />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: '600' }}>Khẩu phần</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--ink)' }}>1 - 2 người ăn</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <ThumbsUp size={20} color="var(--primary)" />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: '600' }}>Trạng thái</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--brand-teal)' }}>Sẵn sàng phục vụ</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price & Action Area */}
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: '600', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Giá thanh toán</div>
                  <span style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--primary)', letterSpacing: '-0.02em' }}>
                    {Number(item.giaTien).toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  {/* Quantity counter */}
                  <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 'var(--rounded-pill)', padding: '0.35rem' }}>
                    <button
                      onClick={() => setQuantity(q => q > 1 ? q - 1 : 1)}
                      style={{ background: 'none', border: 'none', color: 'var(--ink)', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: '50%' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <Minus size={16} />
                    </button>
                    <span style={{ width: '32px', textAlign: 'center', fontWeight: '700', fontSize: '1.1rem', color: 'var(--ink)' }}>{quantity}</span>
                    <button
                      onClick={() => setQuantity(q => q + 1)}
                      style={{ background: 'none', border: 'none', color: 'var(--ink)', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: '50%' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Submit button */}
                  <button
                    className="btn btn-primary"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.65rem', 
                      borderRadius: 'var(--rounded-pill)', 
                      padding: '1rem 2rem', 
                      fontSize: '1.15rem',
                      fontWeight: '700',
                      boxShadow: '0 8px 30px rgba(249, 115, 22, 0.25)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 12px 35px rgba(249, 115, 22, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 8px 30px rgba(249, 115, 22, 0.25)';
                    }}
                    onClick={handleAddToCart}
                  >
                    <ShoppingCart size={22} /> Thêm vào giỏ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Reviews Dashboard & List Section */}
      <div className="card" style={{ padding: '3.5rem', border: '1px solid var(--hairline)', backgroundColor: 'var(--surface-card)' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '2.5rem', letterSpacing: '-0.02em' }}>Đánh giá từ khách hàng ({reviews.length})</h2>

        {/* Ratings Breakdown Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '3rem', marginBottom: '3.5rem', paddingBottom: '3rem', borderBottom: '1px solid var(--hairline)' }}>
          {/* Điểm tổng quan */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1.5rem', background: 'var(--surface-soft)', borderRadius: 'var(--rounded-lg)', border: '1px solid var(--hairline)' }}>
            <span style={{ fontSize: '4.5rem', fontWeight: '900', color: 'var(--ink)', lineHeight: '1' }}>{avgRating}</span>
            <div style={{ display: 'flex', gap: '4px', margin: '0.75rem 0' }}>
              {renderStars(Number(avgRating), 22)}
            </div>
            <span style={{ color: 'var(--muted)', fontSize: '0.95rem', fontWeight: '500' }}>Điểm số trung bình dựa trên {reviews.length} đánh giá</span>
          </div>

          {/* Chi tiết phân bố sao */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', justifyContent: 'center' }}>
            {[5, 4, 3, 2, 1].map((stars) => {
              const percentage = getRatingPercentage(stars);
              return (
                <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
                  <span style={{ width: '45px', fontSize: '0.9rem', fontWeight: '700', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {stars} <Star size={12} fill="var(--muted)" color="var(--muted)" />
                  </span>
                  <div style={{ flexGrow: 1, height: '8px', background: 'var(--hairline)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${percentage}%`, height: '100%', background: '#fbbf24', borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
                  </div>
                  <span style={{ width: '40px', fontSize: '0.9rem', fontWeight: '700', color: 'var(--ink)', textAlign: 'right' }}>
                    {percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* List of customer reviews */}
        {loadingReviews ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {[1, 2].map(i => (
              <div key={i} style={{ padding: '2rem', borderRadius: 'var(--rounded-lg)', border: '1px solid var(--hairline)', animation: 'pulse 1.5s infinite' }}>
                <div style={{ height: '24px', backgroundColor: 'var(--hairline)', width: '25%', marginBottom: '0.75rem', borderRadius: '4px' }}></div>
                <div style={{ height: '16px', backgroundColor: 'var(--hairline)', width: '75%', borderRadius: '4px' }}></div>
              </div>
            ))}
          </div>
        ) : reviews.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {reviews.map((review, idx) => (
              <div 
                key={review.id_danhGia} 
                style={{ 
                  padding: '2rem', 
                  borderRadius: 'var(--rounded-lg)', 
                  border: '1px solid var(--hairline)', 
                  backgroundColor: 'var(--surface-soft)',
                  transition: 'transform 0.2s ease',
                  cursor: 'default'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* User Avatar */}
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: 'var(--primary)', fontSize: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                      {review.tenNguoiDung ? review.tenNguoiDung.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <span style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--ink)' }}>{review.tenNguoiDung}</span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.1rem' }}>Khách hàng đã trải nghiệm</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {renderStars(review.soSao, 14)}
                  </div>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', margin: 0, marginTop: '0.5rem', lineHeight: '1.6' }}>
                  {review.noiDung || <span style={{ fontStyle: 'italic', opacity: 0.6 }}>(Khách hàng không để lại nhận xét bằng lời)</span>}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--muted)', background: 'var(--surface-soft)', borderRadius: 'var(--rounded-lg)', border: '1px dashed var(--hairline)' }}>
            <Star size={54} style={{ margin: '0 auto 1.25rem', opacity: 0.25 }} />
            <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: 'var(--ink)' }}>Chưa có đánh giá nào cho món ăn này.</p>
            <p style={{ fontSize: '0.95rem', marginTop: '0.5rem', color: 'var(--muted)' }}>Hãy là người đầu tiên thưởng thức và để lại đánh giá của bạn nhé!</p>
          </div>
        )}
      </div>
    </div>
  </div>
);
};

export default FoodDetailPage;