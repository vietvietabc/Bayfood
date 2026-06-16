import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/axiosSetup';

const AdminMenu = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterCat]);

  const [formData, setFormData] = useState({
    tenMon: '',
    id_danhMuc: '',
    giaTien: '',
    moTa: '',
    hinhAnh: '',
    trangThai: 'Đang bán',
  });

  const fetchItems = async () => {
    try {
      const response = await api.get('http://localhost:8000/api/thucdon/all/list');
      setItems(response.data);
    } catch (error) {
      console.error('Lỗi tải thực đơn', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('http://localhost:8000/api/danhmuc');
      setCategories(res.data);
    } catch (error) {
      console.error('Lỗi tải danh mục', error);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({ tenMon: '', id_danhMuc: categories[0]?.id_danhMuc || '', giaTien: '', moTa: '', hinhAnh: '', trangThai: 'Đang bán' });
    setImagePreview('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setIsEditing(true);
    setCurrentId(item.id_monAn);
    setFormData({
      tenMon: item.tenMon,
      id_danhMuc: item.id_danhMuc,
      giaTien: item.giaTien,
      moTa: item.moTa || '',
      hinhAnh: item.hinhAnh || '',
      trangThai: item.trangThai,
    });
    setImagePreview(item.hinhAnh || '');
    setIsModalOpen(true);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
    setUploading(true);
    try {
      const uploadForm = new FormData();
      uploadForm.append('file', file);
      const response = await api.post('http://localhost:8000/api/upload/table-image', uploadForm, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData(prev => ({ ...prev, hinhAnh: response.data.url }));
    } catch (error) {
      alert('Upload ảnh thất bại: ' + (error.response?.data?.detail || error.message));
      setImagePreview('');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (uploading) { alert('Vui lòng chờ ảnh upload xong!'); return; }
    const payload = { ...formData, id_danhMuc: parseInt(formData.id_danhMuc), giaTien: parseFloat(formData.giaTien) };
    try {
      if (isEditing) {
        await api.put(`http://localhost:8000/api/thucdon/${currentId}`, payload);
      } else {
        await api.post('http://localhost:8000/api/thucdon', payload);
      }
      setIsModalOpen(false);
      fetchItems();
    } catch (error) {
      alert(error.response?.data?.detail || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn ngừng bán món này không?')) {
      try {
        await api.delete(`http://localhost:8000/api/thucdon/${id}`);
        fetchItems();
      } catch (error) {
        alert(error.response?.data?.detail || 'Có lỗi xảy ra');
      }
    }
  };

  const filtered = filterCat === 0 ? items : items.filter(i => i.id_danhMuc === filterCat);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const getCatName = (id) => categories.find(c => c.id_danhMuc === id)?.tenDanhMuc || `DM${id}`;

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Cập nhật thực đơn</h1>
        <button onClick={handleOpenAdd} className="btn btn-primary">Thêm Món Mới</button>
      </div>

      {/* Bộ lọc danh mục */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button onClick={() => setFilterCat(0)} style={{ padding: '0.4rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: filterCat === 0 ? 'bold' : 'normal', background: filterCat === 0 ? 'var(--primary)' : 'transparent', color: filterCat === 0 ? 'white' : 'var(--text-muted)', fontSize: '0.875rem' }}>
          Tất cả
        </button>
        {categories.map(cat => (
          <button key={cat.id_danhMuc} onClick={() => setFilterCat(cat.id_danhMuc)} style={{ padding: '0.4rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: filterCat === cat.id_danhMuc ? 'bold' : 'normal', background: filterCat === cat.id_danhMuc ? 'var(--primary)' : 'transparent', color: filterCat === cat.id_danhMuc ? 'white' : 'var(--text-muted)', fontSize: '0.875rem' }}>
            {cat.tenDanhMuc}
          </button>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải dữ liệu...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-light)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Ảnh</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Tên Món</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Danh Mục</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Giá Tiền</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Trạng Thái</th>
                <th style={{ padding: '1rem', fontWeight: 'bold', textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map(item => (
                <tr key={item.id_monAn} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {item.hinhAnh
                      ? <img src={item.hinhAnh} alt={item.tenMon} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }} />
                      : <div style={{ width: '48px', height: '48px', background: 'var(--surface-light)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Không có</div>
                    }
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{item.tenMon}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{getCatName(item.id_danhMuc)}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.giaTien)}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.875rem', fontWeight: 'bold', background: item.trangThai === 'Đang bán' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: item.trangThai === 'Đang bán' ? '#10b981' : '#ef4444' }}>
                      {item.trangThai}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => handleOpenEdit(item)} style={{ padding: '0.4rem 0.875rem', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                        Sửa
                      </button>
                      <button onClick={() => handleDelete(item.id_monAn)} style={{ padding: '0.4rem 0.875rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                        Ngừng bán
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Không có món ăn nào.</td></tr>
              )}
            </tbody>
          </table>
        )}

        {/* Pagination UI */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--surface-light)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Hiển thị {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filtered.length)} trong tổng số {filtered.length} món
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
      </div>

      {/* Modal Thêm/Sửa Món */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '560px', maxHeight: '92vh', overflowY: 'auto', padding: '2rem', borderRadius: '14px' }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.4rem' }}>
              {isEditing ? 'Sửa Thông Tin Món Ăn' : 'Thêm Món Ăn Mới'}
            </h2>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>Tên Món <span style={{ color: '#ef4444' }}>*</span></label>
                <input style={inputStyle} value={formData.tenMon} onChange={e => setFormData({ ...formData, tenMon: e.target.value })} required placeholder="VD: Phở bò, Cà phê sữa đá..." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>Danh Mục <span style={{ color: '#ef4444' }}>*</span></label>
                  <select style={inputStyle} value={formData.id_danhMuc} onChange={e => setFormData({ ...formData, id_danhMuc: e.target.value })} required>
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map(cat => (
                      <option key={cat.id_danhMuc} value={cat.id_danhMuc}>{cat.tenDanhMuc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>Giá Tiền (VNĐ) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="number" style={inputStyle} value={formData.giaTien} onChange={e => setFormData({ ...formData, giaTien: e.target.value })} required min="0" placeholder="VD: 65000" />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>Trạng Thái</label>
                <select style={inputStyle} value={formData.trangThai} onChange={e => setFormData({ ...formData, trangThai: e.target.value })}>
                  <option value="Đang bán">Đang bán</option>
                  <option value="Ngừng bán">Ngừng bán</option>
                  <option value="Hết hàng">Hết hàng</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>Mô Tả</label>
                <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={formData.moTa} onChange={e => setFormData({ ...formData, moTa: e.target.value })} placeholder="Mô tả ngắn về món ăn..." />
              </div>

              {/* Upload ảnh */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>Hình Ảnh Món Ăn</label>
                {imagePreview && (
                  <img src={imagePreview} alt="preview" style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.75rem', border: '1px solid var(--border)' }} />
                )}
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                <button type="button" onClick={() => fileInputRef.current.click()} disabled={uploading} style={{ width: '100%', padding: '0.875rem', border: '2px dashed var(--border)', borderRadius: '8px', background: 'var(--surface-light)', cursor: uploading ? 'not-allowed' : 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem', boxSizing: 'border-box' }}>
                  {uploading ? 'Đang tải ảnh lên...' : (imagePreview ? 'Chọn ảnh khác' : 'Nhấn để chọn ảnh từ máy tính')}
                </button>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>Hỗ trợ JPG, PNG, WEBP · Tối đa 5MB</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={uploading}>
                  {uploading ? 'Đang xử lý...' : (isEditing ? 'Lưu Thay Đổi' : 'Thêm Món Mới')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMenu;
