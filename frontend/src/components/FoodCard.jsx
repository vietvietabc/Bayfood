import React from 'react';
import { Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';

const FoodCard = ({ item, onViewDetail }) => {
  const { addToCart } = useCart();

  // Hình ảnh placeholder đẹp mắt từ Unsplash theo chủ đề ẩm thực nếu không có ảnh
  const defaultImage = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`;
  const imageUrl = item.hinhAnh || defaultImage;

  return (
    <div className="card">
      <div 
        style={{ height: '200px', overflow: 'hidden', cursor: 'pointer' }}
        onClick={() => onViewDetail && onViewDetail(item)}
      >
        <img
          src={imageUrl}
          alt={item.tenMon}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
          onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
        />
      </div>
      <div style={{ padding: '1.5rem' }}>
        <h2 
            style={{ fontSize: '1.25rem', marginBottom: '0.5rem', cursor: 'pointer' }}
            onClick={() => onViewDetail && onViewDetail(item)}
        >
            {item.tenMon}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem', minHeight: '40px' }}>
          {item.moTa || 'Món ăn thơm ngon chuẩn vị BayFood.'}
        </p>
        <div className="flex justify-between items-center">
          <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>
            {Number(item.giaTien).toLocaleString('vi-VN')} đ
          </span>
          <button
            className="btn btn-primary"
            style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={(e) => {
                e.stopPropagation();
                addToCart(item);
            }}
            aria-label={`Thêm ${item.tenMon} vào giỏ hàng`}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FoodCard;
