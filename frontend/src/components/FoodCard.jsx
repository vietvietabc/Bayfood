import React from 'react';
import { Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';

const FoodCard = React.memo(({ item, onViewDetail }) => {
  const { addToCart } = useCart();

  const defaultImage = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`;
  const imageUrl = item.hinhAnh || defaultImage;

  return (
    <div className="card food-card">
      <div
        className="food-card-image"
        onClick={() => onViewDetail && onViewDetail(item)}
      >
        <img
          src={imageUrl}
          alt={item.tenMon}
          loading="lazy"
          className="food-card-img"
        />
      </div>
      <div className="food-card-body">
        <h2 className="food-card-title" onClick={() => onViewDetail && onViewDetail(item)}>
          {item.tenMon}
        </h2>
        <p className="food-card-desc">
          {item.moTa || 'Món ăn thơm ngon chuẩn vị BayFood.'}
        </p>
        <div className="flex justify-between items-center">
          <span className="food-card-price">
            {Number(item.giaTien).toLocaleString('vi-VN')} đ
          </span>
          <button
            className="btn btn-primary food-card-add-btn"
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
});

FoodCard.displayName = 'FoodCard';

export default FoodCard;
