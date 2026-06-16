import React, { useState, useEffect } from 'react';
import api from '../../utils/axiosSetup';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ tenDanhMuc: '', moTa: '' });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchCategories = async () => {
    try {
      const response = await api.get('http://localhost:8000/api/danhmuc');
      setCategories(response.data);
    } catch (error) {
      console.error('Lỗi tải danh mục', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({ tenDanhMuc: '', moTa: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setIsEditing(true);
    setCurrentId(cat.id_danhMuc);
    setFormData({ tenDanhMuc: cat.tenDanhMuc, moTa: cat.moTa || '' });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`http://localhost:8000/api/danhmuc/${currentId}`, formData);
      } else {
        await api.post('http://localhost:8000/api/danhmuc', formData);
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (error) {
      alert(error.response?.data?.detail || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa danh mục này không?')) {
      try {
        await api.delete(`http://localhost:8000/api/danhmuc/${id}`);
        fetchCategories();
      } catch (error) {
        alert(error.response?.data?.detail || 'Có lỗi xảy ra khi xóa');
      }
    }
  };

  const inputStyle = {
    padding: '0.75rem 1rem',
    border: '1.5px solid var(--border)',
    borderRadius: '8px',
    background: 'var(--surface-light)',
    color: 'var(--text)',
    fontSize: '1rem',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
  };

  return (
    <div>
      {(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        const currentCategories = categories.slice(indexOfFirstItem, indexOfLastItem);
        const totalPages = Math.ceil(categories.length / itemsPerPage);

        return (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Cập nhật danh mục</h1>
        <button onClick={handleOpenAdd} className="btn btn-primary">Thêm Danh Mục</button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải dữ liệu...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-light)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Mã</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Tên Danh Mục</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Mô Tả</th>
                <th style={{ padding: '1rem', fontWeight: 'bold', textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {currentCategories.map(cat => (
                <tr key={cat.id_danhMuc} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>#DM{cat.id_danhMuc}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{cat.tenDanhMuc}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{cat.moTa || 'Không có mô tả'}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => handleOpenEdit(cat)} style={{ padding: '0.4rem 0.875rem', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                        Sửa
                      </button>
                      <button onClick={() => handleDelete(cat.id_danhMuc)} style={{ padding: '0.4rem 0.875rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Không có danh mục nào.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination UI */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--surface-light)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Hiển thị {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, categories.length)} trong tổng số {categories.length} danh mục
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{
                padding: '0.4rem 0.8rem', border: '1px solid var(--border)', borderRadius: '0.5rem',
                background: currentPage === 1 ? 'var(--surface-card)' : 'var(--surface)',
                color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-main)',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.85rem'
              }}
            >
              Trước
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{
                        padding: '0.4rem 0.75rem', border: 'none', borderRadius: '0.4rem',
                        background: currentPage === page ? 'var(--primary)' : 'transparent',
                        color: currentPage === page ? '#fff' : 'var(--text-main)',
                        fontWeight: currentPage === page ? 'bold' : 'normal',
                        cursor: 'pointer', fontSize: '0.85rem'
                      }}
                    >
                      {page}
                    </button>
                  );
                }
                if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} style={{ padding: '0 0.2rem', color: 'var(--text-muted)' }}>...</span>;
                }
                return null;
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{
                padding: '0.4rem 0.8rem', border: '1px solid var(--border)', borderRadius: '0.5rem',
                background: currentPage === totalPages ? 'var(--surface-card)' : 'var(--surface)',
                color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-main)',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.85rem'
              }}
            >
              Sau
            </button>
          </div>
        </div>
      )}


      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '480px', padding: '2rem', position: 'relative', borderRadius: '14px' }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.4rem' }}>
              {isEditing ? 'Sửa Danh Mục' : 'Thêm Danh Mục Mới'}
            </h2>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>Tên Danh Mục <span style={{ color: '#ef4444' }}>*</span></label>
                <input style={inputStyle} value={formData.tenDanhMuc} onChange={e => setFormData({ ...formData, tenDanhMuc: e.target.value })} required placeholder="VD: Món khai vị, Đồ uống..." />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>Mô Tả</label>
                <textarea style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }} value={formData.moTa} onChange={e => setFormData({ ...formData, moTa: e.target.value })} placeholder="Mô tả ngắn về danh mục này..." />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Hủy</button>
                <button type="submit" className="btn btn-primary">{isEditing ? 'Lưu Thay Đổi' : 'Tạo Danh Mục'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </>
      );
    })()}
    </div>
  );
};

export default AdminCategories;
