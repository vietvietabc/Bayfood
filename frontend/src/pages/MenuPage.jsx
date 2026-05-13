import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FoodCard from '../components/FoodCard';
import { Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const MenuPage = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const { selectedTableId, setSelectedTableId } = useCart();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tableParam = params.get('table');

    if (tableParam) {
      setSelectedTableId(tableParam);
    }
  }, [location.search, setSelectedTableId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [menuRes, catRes] = await Promise.all([
          axios.get('http://localhost:8000/api/thucdon'),
          axios.get('http://localhost:8000/api/thucdon/danhmuc')
        ]);
        setMenuItems(menuRes.data);
        setCategories(catRes.data);
      } catch (error) {
        console.error("Error fetching data", error);
        // Fallback data for visual testing if backend is not running
        setCategories([{ id_danhMuc: 1, tenDanhMuc: 'Món Chính' }, { id_danhMuc: 2, tenDanhMuc: 'Đồ Uống' }]);
        setMenuItems([
          { id_monAn: 1, id_danhMuc: 1, tenMon: 'Bò Bít Tết', giaTien: 250000, hinhAnh: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800' },
          { id_monAn: 2, id_danhMuc: 1, tenMon: 'Cá Hồi Nướng', giaTien: 180000, hinhAnh: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800' },
          { id_monAn: 3, id_danhMuc: 2, tenMon: 'Nước Ép Cam', giaTien: 450000, hinhAnh: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=800' },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredMenu = activeCategory
    ? menuItems.filter(item => item.id_danhMuc === activeCategory)
    : menuItems;

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '0.35rem' }}>Thực Đơn</h1>
          {selectedTableId ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', borderRadius: '999px', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
              Bàn đang gọi món: #{selectedTableId}
            </div>
          ) : (
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>Quét QR bàn để tự động gắn bàn vào đơn hàng.</p>
          )}
        </div>
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Tìm kiếm món ăn..."
            className="input-field"
            style={{ paddingLeft: '2.5rem' }}
          />
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>
      </div>

      <div className="flex gap-4 mb-8" style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <button
          className={`btn ${activeCategory === null ? 'btn-primary' : 'btn-outline'}`}
          style={{ whiteSpace: 'nowrap' }}
          onClick={() => setActiveCategory(null)}
        >
          Tất Cả
        </button>
        {categories.map(cat => (
          <button
            key={cat.id_danhMuc}
            className={`btn ${activeCategory === cat.id_danhMuc ? 'btn-primary' : 'btn-outline'}`}
            style={{ whiteSpace: 'nowrap' }}
            onClick={() => setActiveCategory(cat.id_danhMuc)}
          >
            {cat.tenDanhMuc}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-6">
          {filteredMenu.map(item => (
            <FoodCard key={item.id_monAn} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuPage;
