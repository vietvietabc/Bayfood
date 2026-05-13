import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Clock, ChefHat, Utensils } from 'lucide-react';

const HomePage = () => {
  return (
    <div>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg"></div>
        <div className="container">
          <div className="grid grid-cols-2 items-center gap-8" style={{ minHeight: '80vh' }}>
            <div>
              <h1 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', lineHeight: '1.1' }}>
                Khám phá hương vị <br />
                <span className="text-gradient">tuyệt hảo</span> tại BayFood
              </h1>
              <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '500px' }}>
                Trải nghiệm ẩm thực đẳng cấp với không gian sang trọng và menu đa dạng, được chế biến từ những nguyên liệu tươi ngon nhất.
              </p>
              <div className="flex gap-4">
                <Link to="/menu" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>
                  Xem Thực Đơn <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
                </Link>
                <Link to="/reservation" className="btn btn-outline" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>
                  Đặt Bàn Ngay
                </Link>
              </div>
            </div>
            <div className="flex justify-center relative">
              <div style={{ position: 'relative', width: '100%', maxWidth: '500px', aspectRatio: '1/1' }}>
                {/* Một hình ảnh đồ ăn xoay nhẹ tạo hiệu ứng */}
                <img 
                  src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                  alt="BayFood Signature Dish" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover', 
                    borderRadius: '50%',
                    border: '8px solid var(--surface)',
                    boxShadow: 'var(--shadow-lg)',
                    animation: 'spin 60s linear infinite'
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
                  bottom: '10%', 
                  right: '-5%', 
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  animation: 'float 3s ease-in-out infinite'
                }}>
                  <div style={{ background: '#fbbf24', padding: '0.5rem', borderRadius: '50%', color: '#92400e' }}>
                    <Star size={24} fill="currentColor" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>4.9/5</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>1000+ Đánh giá</div>
                  </div>
                </div>
                <style>
                  {`
                    @keyframes float {
                      0% { transform: translateY(0px); }
                      50% { transform: translateY(-10px); }
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
      <section className="py-16" style={{ background: 'var(--surface-light)' }}>
        <div className="container">
          <div className="grid grid-cols-3 gap-8">
            <div className="card text-center" style={{ padding: '2rem' }}>
              <div style={{ display: 'inline-block', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--secondary)', borderRadius: '50%', marginBottom: '1rem' }}>
                <ChefHat size={40} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Đầu Bếp Chuyên Nghiệp</h3>
              <p style={{ color: 'var(--text-muted)' }}>Món ăn được chuẩn bị bởi những đầu bếp hàng đầu.</p>
            </div>
            <div className="card text-center" style={{ padding: '2rem' }}>
              <div style={{ display: 'inline-block', padding: '1rem', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)', borderRadius: '50%', marginBottom: '1rem' }}>
                <Utensils size={40} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Nguyên Liệu Tươi Sạch</h3>
              <p style={{ color: 'var(--text-muted)' }}>Cam kết sử dụng nguyên liệu tươi ngon nhất mỗi ngày.</p>
            </div>
            <div className="card text-center" style={{ padding: '2rem' }}>
              <div style={{ display: 'inline-block', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '50%', marginBottom: '1rem' }}>
                <Clock size={40} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Phục Vụ Nhanh Chóng</h3>
              <p style={{ color: 'var(--text-muted)' }}>Thời gian lên món nhanh, đảm bảo trải nghiệm tốt nhất.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
