import React, { useState, useEffect, useReducer } from 'react';
import axios from '../utils/axiosSetup';
import FoodCard from '../components/FoodCard';
import { Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';

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
  const { selectedTableId, setSelectedTableId } = useCart();

  useEffect(() => {
    const tableParam = searchParams.get('table');
    if (tableParam) {
      setSelectedTableId(tableParam);
    }
  }, [searchParams, setSelectedTableId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');
        const [menuRes, catRes] = await Promise.all([
          axios.get(`${apiUrl}/api/thucdon`),
          axios.get(`${apiUrl}/api/thucdon/danhmuc`)
        ]);
        dispatch({ type: 'FETCH_SUCCESS', payload: { menuItems: menuRes.data, categories: catRes.data } });
      } catch (error) {
        console.error("Error fetching data", error);
        // Fallback data for visual testing if backend is not running
        dispatch({
          type: 'FETCH_SUCCESS',
        });
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
          <h1 className="text-gradient text-4xl mb-1">Thực Đơn</h1>
          {selectedTableId && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100/10 text-primary text-sm font-bold">
              Bàn đang gọi món: #{selectedTableId}
              <button
                onClick={() => setSelectedTableId(null)}
                className="ml-2 flex items-center justify-center bg-red-100/10 text-red-500 border-none rounded-full w-5 h-5 cursor-pointer text-xs"
                title="Bỏ chọn bàn"
              >
                ✕
              </button>
            </div>
          )}
        </div>
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Tìm kiếm món ăn..."
            className="input-field pl-10"
            aria-label="Tìm kiếm món ăn"
          />
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
        <button
          className={`btn whitespace-nowrap ${activeCategory === null ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveCategory(null)}
        >
          Tất Cả
        </button>
        {categories.map(cat => (
          <button
            key={cat.id_danhMuc}
            className={`btn whitespace-nowrap ${activeCategory === cat.id_danhMuc ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveCategory(cat.id_danhMuc)}
          >
            {cat.tenDanhMuc}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="w-10 h-10 border-4 border-border border-t-primary rounded-full animate-spin"></div>
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
