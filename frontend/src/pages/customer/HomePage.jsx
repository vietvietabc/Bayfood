import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Clock, ChefHat, Utensils } from 'lucide-react';

const HomePage = () => {
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
                  background: 'rgba(22, 23, 25, 0.85)',
                  border: '1px solid var(--hairline)',
                  borderRadius: 'var(--rounded-lg)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                  animation: 'float 4s ease-in-out infinite'
                }}>
                  <div style={{ background: 'rgba(251, 191, 36, 0.15)', padding: '0.4rem', borderRadius: '50%', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Star size={18} fill="currentColor" />
                  </div>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--ink)' }}>4.9/5</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: '600' }}>1,000+ Đánh giá</div>
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
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.6rem', fontWeight: '700', color: 'var(--ink)' }}>Đầu Bếp Chuyên Nghiệp</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>Món ăn được chuẩn bị bởi những đầu bếp nghệ nhân hàng đầu thế giới.</p>
            </div>
            
            <div className="card text-center" style={{ padding: '2.5rem 2rem', background: 'var(--surface-card)', border: '1px solid var(--hairline)', borderRadius: 'var(--rounded-lg)' }}>
              <div style={{ display: 'inline-flex', padding: '0.9rem', background: 'rgba(245, 158, 11, 0.12)', color: 'var(--brand-lavender)', borderRadius: '50%', marginBottom: '1.25rem', alignItems: 'center', justifyContent: 'center' }}>
                <Utensils size={32} />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.6rem', fontWeight: '700', color: 'var(--ink)' }}>Nguyên Liệu Tươi Sạch</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>Cam kết 100% nguyên liệu hữu cơ, tươi mới chuẩn Organic mỗi ngày.</p>
            </div>

            <div className="card text-center" style={{ padding: '2.5rem 2rem', background: 'var(--surface-card)', border: '1px solid var(--hairline)', borderRadius: 'var(--rounded-lg)' }}>
              <div style={{ display: 'inline-flex', padding: '0.9rem', background: 'rgba(52, 211, 153, 0.1)', color: 'var(--brand-teal)', borderRadius: '50%', marginBottom: '1.25rem', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={32} />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.6rem', fontWeight: '700', color: 'var(--ink)' }}>Phục Vụ Nhanh Chóng</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>Quy trình tối ưu hóa bằng công nghệ hiện đại, lên món trong tích tắc.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
