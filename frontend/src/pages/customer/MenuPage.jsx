import React, { useState, useEffect, useReducer } from 'react';
import axios from 'axios';
import FoodCard from '../../components/FoodCard';
import { Search, Calendar, Clock, X } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';

const initialState = { menuItems: [], categories: [], loading: true, error: null };
function reducer(state, action) {
  switch (action.type) {
    case 'FETCH_SUCCESS':
      return { ...state, menuItems: action.payload.menuItems, categories: action.payload.categories, loading: false };
    case 'FETCH_ERROR':
      return { ...state, error: action.payload, loading: false };
    default: return state;
  }
}

const MenuPage = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { menuItems, categories, loading } = state;
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { selectedTableId, setSelectedTableId } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingReservation, setPendingReservation] = useState(null); // Banner đặt bàn chờ

  useEffect(() => {
    const tableParam = searchParams.get('table');
    if (tableParam) setSelectedTableId(tableParam);
  }, [searchParams, setSelectedTableId]);

  // Đọc pendingReservation từ sessionStorage (set bởi trang đặt bàn)
  useEffect(() => {
    const raw = sessionStorage.getItem('pendingReservation');
    if (raw) {
      try { setPendingReservation(JSON.parse(raw)); } catch {}
    }
  }, []);

  const dismissReservation = () => {
    sessionStorage.removeItem('pendingReservation');
    setPendingReservation(null);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [menuRes, catRes] = await Promise.all([
          axios.get('http://localhost:8000/api/thucdon'),
          axios.get('http://localhost:8000/api/thucdon/danhmuc')
        ]);
        dispatch({ type: 'FETCH_SUCCESS', payload: { menuItems: menuRes.data, categories: catRes.data } });
      } catch (error) {
        console.error("Error fetching data", error);
        dispatch({
          type: 'FETCH_SUCCESS',
          payload: { menuItems: [], categories: [] }
        });
      }
    };
    fetchData();
  }, []);

  const filteredMenu = menuItems.filter(item => {
    const matchesCategory = activeCategory ? item.id_danhMuc === activeCategory : true;
    const matchesSearch = item.tenMon.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      {/* ===== BANNER ĐẶT BÀN CHỜ ===== */}
      {pendingReservation && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem',
          padding: '0.9rem 1.25rem', borderRadius: '0.85rem', marginBottom: '1.5rem',
          background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(234,88,12,0.08))',
          border: '1px solid rgba(249,115,22,0.35)',
          boxShadow: '0 2px 12px rgba(249,115,22,0.12)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.4rem' }}>🍽️</span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                Đặt bàn kèm theo: <span style={{ color: '#f97316' }}>{pendingReservation.tenBan} ({pendingReservation.viTri})</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Calendar size={12} /> {new Date(pendingReservation.thoiGianDen).toLocaleDateString('vi-VN')}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Clock size={12} /> {new Date(pendingReservation.thoiGianDen).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {pendingReservation.tienCoc > 0 && (
                  <span style={{ color: '#f97316', fontWeight: '600' }}>
                    Cọc: {Number(pendingReservation.tienCoc).toLocaleString('vi-VN')} ₫
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => navigate('/cart')}
              className="btn btn-primary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              🛒 Đến giỏ hàng & thanh toán
            </button>
            <button
              onClick={dismissReservation}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.3rem', display: 'flex', alignItems: 'center' }}
              title="Hủy đặt bàn kèm theo"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>

        <div>
          <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '0.25rem', fontWeight: '800' }}>Thực Đơn</h1>
          {selectedTableId ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.85rem', borderRadius: 'var(--rounded-pill)', background: 'rgba(94, 106, 210, 0.12)', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: '700' }}>
              Bàn đang gọi món: #{selectedTableId}
              <button
                onClick={() => setSelectedTableId(null)}
                style={{ marginLeft: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', fontSize: '0.75rem' }}
                title="Bỏ chọn bàn"
                aria-label="Bỏ chọn bàn"
              >
                ✕
              </button>
            </div>
          ) : (
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>Quét QR bàn để tự động gắn bàn vào đơn hàng.</p>
          )}
        </div>
        <div style={{ position: 'relative', width: '280px' }}>
          <input
            type="text"
            placeholder="Tìm kiếm món ăn..."
            className="input-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem', borderRadius: 'var(--rounded-md)' }}
            aria-label="Tìm kiếm món ăn"
          />
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted)',
              pointerEvents: 'none'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
        <button
          className={`btn ${activeCategory === null ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveCategory(null)}
          style={{ whiteSpace: 'nowrap', borderRadius: 'var(--rounded-pill)', padding: '0.5rem 1.25rem', fontWeight: '600' }}
        >
          Tất Cả
        </button>
        {categories.map(cat => (
          <button
            key={cat.id_danhMuc}
            className={`btn ${activeCategory === cat.id_danhMuc ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveCategory(cat.id_danhMuc)}
            style={{ whiteSpace: 'nowrap', borderRadius: 'var(--rounded-pill)', padding: '0.5rem 1.25rem', fontWeight: '600' }}
          >
            {cat.tenDanhMuc}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem 0' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid var(--hairline)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        </div>
      ) : filteredMenu.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--muted)', background: 'var(--surface-card)', borderRadius: 'var(--rounded-lg)', border: '1px solid var(--hairline)' }}>
          🔍 Không tìm thấy món ăn nào phù hợp.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {filteredMenu.map(item => (
            <FoodCard
              key={item.id_monAn}
              item={item}
              onViewDetail={() => navigate(`/menu/${item.id_monAn}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuPage;
