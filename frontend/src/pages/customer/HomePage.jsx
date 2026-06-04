import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Clock, ChefHat, Utensils, MapPin, Phone, Mail, Quote } from 'lucide-react';

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');


const HomePage = () => {
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/danhgia/?type=general`);
        if (res.ok) {
          const data = await res.json();
          // Chỉ lấy tối đa 6 đánh giá gần nhất
          setReviews(data.slice(0, 6));
        }
      } catch (e) {
        console.error('Lỗi tải đánh giá', e);
      } finally {
        setReviewsLoading(false);
      }
    };
    fetchReviews();
  }, []);

  // Tính rating trung bình
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.soSao, 0) / reviews.length).toFixed(1)
    : '4.9';

  const renderStars = (rating) =>
    [...Array(5)].map((_, i) => (
      <Star key={i} size={14} fill={i < rating ? '#fbbf24' : 'transparent'} color={i < rating ? '#fbbf24' : '#d1d5db'} />
    ));

  return (
    <div style={{ background: 'var(--canvas)', minHeight: '100vh', overflow: 'hidden' }}>
      {/* Hero Section */}
      <section className="hero" style={{ position: 'relative', py: '4rem' }}>
        <div className="hero-bg" style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 80% 20%, rgba(249, 115, 22, 0.18), transparent 50%), radial-gradient(circle at 20% 80%, rgba(16, 185, 129, 0.12), transparent 50%)',
          zIndex: 0
        }}></div>
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="grid grid-cols-2 items-center gap-8" style={{ minHeight: '80vh' }}>
            <div>
              <h1 style={{ fontSize: '3.75rem', marginBottom: '1.5rem', lineHeight: '1.1', fontWeight: '800', letterSpacing: '-0.03em' }}>
                Khám phá hương vị <br />
                <span className="text-gradient">tuyệt hảo</span> tại BayFood
              </h1>
              <p style={{ fontSize: '1.2rem', color: 'var(--muted)', marginBottom: '2.5rem', maxWidth: '540px', lineHeight: '1.6' }}>
                Trải nghiệm ẩm thực đẳng cấp với không gian sang trọng và menu đa dạng, được chế biến từ những nguyên liệu tươi ngon nhất bởi các đầu bếp nghệ nhân.
              </p>
              <div className="flex gap-4">
                <Link to="/menu" className="btn btn-primary" style={{ padding: '0.85rem 2.2rem', fontSize: '1rem', fontWeight: '700', borderRadius: 'var(--rounded-md)', boxShadow: '0 8px 30px rgba(249, 115, 22, 0.35)' }}>
                  Xem Thực Đơn <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
                </Link>
                <Link to="/reservation" className="btn btn-outline" style={{ padding: '0.85rem 2.2rem', fontSize: '1rem', fontWeight: '700', borderRadius: 'var(--rounded-md)', border: '1px solid var(--hairline)', color: 'var(--ink)', background: 'var(--surface-soft)' }}>
                  Đặt Bàn Ngay
                </Link>
              </div>
            </div>
            <div className="flex justify-center relative">
              <div style={{ position: 'relative', width: '100%', maxWidth: '460px', aspectRatio: '1/1' }}>
                {/* Glow ring behind food */}
                <div style={{
                  position: 'absolute',
                  inset: '-10px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary), var(--brand-lavender), var(--brand-teal))',
                  filter: 'blur(30px)',
                  opacity: 0.4,
                  zIndex: -1
                }} />

                {/* Food Image */}
                <img
                  src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="BayFood Signature Dish"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '50%',
                    border: '4px solid var(--hairline)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    animation: 'spin 80s linear infinite'
                  }}
                />
                <style>
                  {`
                    @keyframes spin {
                      from { transform: rotate(0deg); }
                      to { transform: rotate(360deg); }
                    }
                  `}
                </style>
                {/* Floating badge */}
                <div className="card" style={{
                  position: 'absolute',
                  bottom: '8%',
                  right: '-2%',
                  padding: '0.85rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--hairline)',
                  borderRadius: 'var(--rounded-lg)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                  animation: 'float 4s ease-in-out infinite'
                }}>
                  <div style={{ background: 'rgba(251, 191, 36, 0.15)', padding: '0.4rem', borderRadius: '50%', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Star size={18} fill="currentColor" />
                  </div>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--ink)' }}>{avgRating}/5</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: '600' }}>{reviews.length > 0 ? `${reviews.length}+ Đánh giá` : '1,000+ Đánh giá'}</div>
                  </div>
                </div>
                <style>
                  {`
                    @keyframes float {
                      0% { transform: translateY(0px); }
                      50% { transform: translateY(-8px); }
                      100% { transform: translateY(0px); }
                    }
                  `}
                </style>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16" style={{ background: 'var(--canvas)', borderTop: '1px solid var(--hairline)', position: 'relative' }}>
        <div className="container">
          <div className="grid grid-cols-3 gap-8">
            <div className="card text-center" style={{ padding: '2.5rem 2rem', background: 'var(--surface-card)', border: '1px solid var(--hairline)', borderRadius: 'var(--rounded-lg)' }}>
              <div style={{ display: 'inline-flex', padding: '0.9rem', background: 'rgba(249, 115, 22, 0.12)', color: 'var(--primary)', borderRadius: '50%', marginBottom: '1.25rem', alignItems: 'center', justifyContent: 'center' }}>
                <ChefHat size={32} />
              </div>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '0.6rem', fontWeight: '700', color: 'var(--ink)' }}>Đầu Bếp Chuyên Nghiệp</h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>Món ăn được chuẩn bị bởi những đầu bếp nghệ nhân hàng đầu thế giới.</p>
            </div>

            <div className="card text-center" style={{ padding: '2.5rem 2rem', background: 'var(--surface-card)', border: '1px solid var(--hairline)', borderRadius: 'var(--rounded-lg)' }}>
              <div style={{ display: 'inline-flex', padding: '0.9rem', background: 'rgba(245, 158, 11, 0.12)', color: 'var(--brand-lavender)', borderRadius: '50%', marginBottom: '1.25rem', alignItems: 'center', justifyContent: 'center' }}>
                <Utensils size={32} />
              </div>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '0.6rem', fontWeight: '700', color: 'var(--ink)' }}>Nguyên Liệu Tươi Sạch</h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>Cam kết 100% nguyên liệu hữu cơ, tươi mới chuẩn Organic mỗi ngày.</p>
            </div>

            <div className="card text-center" style={{ padding: '2.5rem 2rem', background: 'var(--surface-card)', border: '1px solid var(--hairline)', borderRadius: 'var(--rounded-lg)' }}>
              <div style={{ display: 'inline-flex', padding: '0.9rem', background: 'rgba(52, 211, 153, 0.1)', color: 'var(--brand-teal)', borderRadius: '50%', marginBottom: '1.25rem', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={32} />
              </div>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '0.6rem', fontWeight: '700', color: 'var(--ink)' }}>Phục Vụ Nhanh Chóng</h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>Quy trình tối ưu hóa bằng công nghệ hiện đại, lên món trong tích tắc.</p>
            </div>
          </div>
        </div>
      </section>

      {/* About / Space Section */}
      <section className="py-20" style={{ background: 'var(--canvas)', borderTop: '1px solid var(--hairline)' }}>
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <img
                src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                alt="Không gian nhà hàng sang trọng"
                style={{ borderRadius: 'var(--rounded-lg)', objectFit: 'cover', width: '100%', height: '350px', border: '1px solid var(--hairline)' }}
              />
              <div className="grid grid-cols-2 gap-4">
                <img
                  src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
                  alt="Ẩm thực tinh tế"
                  style={{ borderRadius: 'var(--rounded-lg)', objectFit: 'cover', width: '100%', height: '220px', border: '1px solid var(--hairline)' }}
                />
                <img
                  src="https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
                  alt="Bàn tiệc lãng mạn"
                  style={{ borderRadius: 'var(--rounded-lg)', objectFit: 'cover', width: '100%', height: '220px', border: '1px solid var(--hairline)' }}
                />
              </div>
            </div>
            <div style={{ padding: '0 2rem' }}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1.25rem', color: 'var(--ink)', lineHeight: '1.2' }}>Không Gian <span className="text-gradient">Đẳng Cấp</span> & Gần Gũi</h2>
              <p style={{ color: 'var(--muted)', fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
                Tọa lạc tại vị trí đắc địa, BayFood mang đến một không gian ẩm thực sang trọng, ấm cúng và đầy tinh tế. Lối kiến trúc mở, kết hợp hoàn hảo giữa ánh sáng tự nhiên và nội thất gỗ tạo nên trải nghiệm trọn vẹn cho những bữa tiệc gia đình hay buổi hẹn hò lãng mạn.
              </p>
              <p style={{ color: 'var(--muted)', fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '2.5rem' }}>
                Với đầy đủ các khu vực từ sảnh chung năng động, khu bàn đôi lãng mạn đến phòng VIP riêng tư cao cấp, chúng tôi sẵn sàng đáp ứng mọi nhu cầu khắt khe nhất của thực khách.
              </p>
              <div style={{ display: 'flex', gap: '2.5rem', marginBottom: '2rem' }}>
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '0.2rem' }}>5+</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Năm Kinh Nghiệm</div>
                </div>
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '0.2rem' }}>30+</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Đầu Bếp VIP</div>
                </div>
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '0.2rem' }}>10k+</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Thực Khách</div>
                </div>
              </div>
              <Link to="/reservation" className="btn btn-outline" style={{ padding: '0.8rem 2rem', fontWeight: '700', borderRadius: 'var(--rounded-md)', border: '1px solid var(--hairline)', width: 'fit-content' }}>
                Xem Vị Trí Bàn
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section - Real Reviews from API */}
      <section className="py-20" style={{ background: 'var(--surface-soft)', borderTop: '1px solid var(--hairline)' }}>
        <div className="container text-center">
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--ink)' }}>Cảm Nhận Thực Khách</h2>
          <p style={{ color: 'var(--muted)', fontSize: '1.1rem', marginBottom: '3.5rem', maxWidth: '600px', margin: '0 auto 3.5rem auto' }}>
            Hàng ngàn thực khách đã lựa chọn BayFood là nơi gửi gắm những bữa tiệc lưu giữ khoảnh khắc khó quên.
          </p>

          {reviewsLoading ? (
            <div style={{ color: 'var(--muted)', padding: '2rem' }}>Đang tải đánh giá...</div>
          ) : reviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
              {reviews.slice(0, 3).map((review, index) => (
                <div key={review.id_danhGia} className="card" style={{ padding: '2.5rem 2rem', background: 'var(--surface-card)', border: '1px solid var(--hairline)', borderRadius: 'var(--rounded-lg)', position: 'relative' }}>
                  <Quote size={40} color="var(--primary)" style={{ opacity: 0.1, position: 'absolute', top: '1.5rem', right: '1.5rem' }} />
                  <div style={{ display: 'flex', gap: '2px', color: '#fbbf24', marginBottom: '1.25rem' }}>
                    {renderStars(review.soSao)}
                    <span style={{ marginLeft: '0.35rem', fontSize: '0.82rem', color: '#f59e0b', fontWeight: 700 }}>{review.soSao}/5</span>
                  </div>
                  <p style={{ color: 'var(--muted)', fontSize: '1rem', lineHeight: '1.7', marginBottom: '2rem', fontStyle: 'italic', minHeight: '80px' }}>
                    "{review.noiDung || 'Trải nghiệm tuyệt vời tại BayFood!'}"
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #f97316, #ea580c)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 800, fontSize: '1.1rem'
                    }}>
                      {(review.tenKhachHang || 'K').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', color: 'var(--ink)' }}>{review.tenKhachHang || 'Khách hàng'}</div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Đơn #{review.id_donHang}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Fallback nếu chưa có đánh giá thật */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
              {[
                { name: 'Hoàng Anh Tú', role: 'Food Blogger', text: 'Nhà hàng có không gian tuyệt vời. Đặc biệt là món Bò Wagyu nướng tảng cực kỳ mềm và mọng nước. Điểm mười cho chất lượng phục vụ!' },
                { name: 'Trần Thu Hà', role: 'Kinh doanh', text: 'Bữa tiệc kỷ niệm ngày cưới của vợ chồng tôi đã hoàn hảo nhờ sự chuẩn bị chu đáo của nhà hàng. Vang đỏ ở đây rất ngon và chuẩn vị.' },
                { name: 'Nguyễn Minh Nhật', role: 'Gia đình', text: 'Rất thích hợp cho gia đình có trẻ nhỏ. Không gian thoáng, nhân viên rất nhiệt tình và hỗ trợ nhanh chóng ngay khi gọi. Sẽ quay lại!' }
              ].map((item, index) => (
                <div key={index} className="card" style={{ padding: '2.5rem 2rem', background: 'var(--surface-card)', border: '1px solid var(--hairline)', borderRadius: 'var(--rounded-lg)', position: 'relative' }}>
                  <Quote size={40} color="var(--primary)" style={{ opacity: 0.1, position: 'absolute', top: '1.5rem', right: '1.5rem' }} />
                  <div style={{ display: 'flex', gap: '2px', color: '#fbbf24', marginBottom: '1.25rem' }}>
                    {[1, 2, 3, 4, 5].map(star => <Star key={star} size={16} fill="currentColor" />)}
                  </div>
                  <p style={{ color: 'var(--muted)', fontSize: '1rem', lineHeight: '1.7', marginBottom: '2rem', fontStyle: 'italic', minHeight: '80px' }}>
                    "{item.text}"
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--surface-border)', overflow: 'hidden', border: '2px solid var(--hairline)' }}>
                      <img src={`https://i.pravatar.cc/100?img=${index + 12}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', color: 'var(--ink)' }}>{item.name}</div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{item.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Info & Contact Footer Section */}
      <section className="py-16" style={{ background: 'var(--canvas)', borderTop: '1px solid var(--hairline)' }}>
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--ink)', marginBottom: '1rem', letterSpacing: '-0.02em' }}>BayFood.</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1.5rem', paddingRight: '1rem' }}>
                Tự hào mang đến phong cách Ẩm thực hiện đại kết hợp Không gian sang trọng. Trải nghiệm từng cung bậc hương vị ngay hôm nay.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--ink)', marginBottom: '1.5rem' }}>Thông Tin Liên Hệ</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <MapPin size={22} color="var(--primary)" style={{ marginTop: '0.1rem' }} />
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--ink)', marginBottom: '0.2rem' }}>Hệ Thống Nhà Hàng</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>Trụ sở: 123 Đường Ngọc Khánh, Ba Đình, Hà Nội<br />Chi nhánh HCM: 45 Nguyễn Huệ, Quận 1</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <Phone size={22} color="var(--primary)" style={{ marginTop: '0.1rem' }} />
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--ink)', marginBottom: '0.2rem' }}>Hotline Đặt Bàn</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>1900 6868 - 0988 123 456</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <Mail size={22} color="var(--primary)" style={{ marginTop: '0.1rem' }} />
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--ink)', marginBottom: '0.2rem' }}>Hỗ Trợ Khách Hàng</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>contact@bayfood.vn</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--ink)', marginBottom: '1.5rem' }}>Giờ Phục Vụ</h3>
              <div className="card" style={{ background: 'var(--surface-card)', padding: '1.5rem', borderRadius: 'var(--rounded-lg)', border: '1px solid var(--hairline)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px dashed var(--hairline)', paddingBottom: '0.75rem' }}>
                  <span style={{ color: 'var(--ink)', fontWeight: '600' }}>Thứ 2 - Thứ 6</span>
                  <span style={{ color: 'var(--muted)' }}>10:00 - 22:30</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px dashed var(--hairline)', paddingBottom: '0.75rem' }}>
                  <span style={{ color: 'var(--ink)', fontWeight: '600' }}>Thứ 7 - CN</span>
                  <span style={{ color: 'var(--muted)' }}>09:00 - 23:30</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ink)', fontWeight: '600' }}>Ngày Lễ / Tết</span>
                  <span style={{ color: 'var(--primary)', fontWeight: '700' }}>Vẫn Mở Cửa</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '3.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>
            <span>&copy; {new Date().getFullYear()} BayFood Restaurant. Vận hành bởi BayFood.</span>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <span style={{ cursor: 'pointer' }}>Chính sách bảo mật</span>
              <span style={{ cursor: 'pointer' }}>Điều khoản</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
