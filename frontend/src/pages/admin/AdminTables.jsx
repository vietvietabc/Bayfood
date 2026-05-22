import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/axiosSetup';
import { PlusCircle, Edit, Trash2, X, Upload, ImageIcon, QrCode } from 'lucide-react';

const AdminTables = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedQrTable, setSelectedQrTable] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    tenBan: '',
    sucChua: 4,
    viTri: 'Tầng 1',
    hinhAnh: '',
    trangThai: 'Trống',
    tienCocMacDinh: 0
  });

  // Preview ảnh trong form
  const [imagePreview, setImagePreview] = useState('');

  // Lấy URL Backend từ biến môi trường
  const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').trim().replace(/\/+$/, "");

  // Hàm chuyển đổi đường dẫn ảnh tương đối thành tuyệt đối
  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
      return path;
    }
    return `${BACKEND_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const fetchTables = async () => {
    try {
      const response = await api.get('/api/ban');
      setTables(response.data);
    } catch (error) {
      console.error('Lỗi tải danh sách bàn', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bàn này không?")) {
      try {
        await api.delete(`/api/ban/${id}`);
        fetchTables();
      } catch (error) {
        alert(error.response?.data?.detail || "Có lỗi xảy ra khi xóa");
      }
    }
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({ tenBan: '', sucChua: 4, viTri: 'Tầng 1', hinhAnh: '', trangThai: 'Trống', tienCocMacDinh: 0 });
    setImagePreview('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (table) => {
    setIsEditing(true);
    setCurrentId(table.id_ban);
    setFormData({
      tenBan: table.tenBan,
      sucChua: table.sucChua,
      viTri: table.viTri,
      hinhAnh: table.hinhAnh || '',
      trangThai: table.trangThai,
      tienCocMacDinh: table.tienCocMacDinh ?? 0
    });
    setImagePreview(table.hinhAnh || '');
    setIsModalOpen(true);
  };

  // Xử lý chọn file ảnh từ máy tính
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Hiển thị preview ngay lập tức
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);

    // Upload lên server
    setUploading(true);
    try {
      const uploadForm = new FormData();
      uploadForm.append('file', file);
      const response = await api.post('/api/upload/table-image', uploadForm, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Lưu URL vào formData
      setFormData(prev => ({ ...prev, hinhAnh: response.data.url }));
    } catch (error) {
      alert("Upload ảnh thất bại: " + (error.response?.data?.detail || error.message));
      setImagePreview('');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (uploading) {
      alert("Vui lòng chờ ảnh upload xong!");
      return;
    }
    try {
      if (isEditing) {
        await api.put(`/api/ban/${currentId}`, formData);
        alert("Cập nhật bàn thành công!");
      } else {
        await api.post('/api/ban', formData);
        alert("Thêm bàn mới thành công!");
      }
      setIsModalOpen(false);
      fetchTables();
    } catch (error) {
      alert("Có lỗi xảy ra: " + (error.response?.data?.detail || error.message));
    }
  };

  const handleOpenQrPreview = (table) => {
    if (!table?.maQR_url) return;
    setSelectedQrTable(table);
  };

  const handleCloseQrPreview = () => {
    setSelectedQrTable(null);
  };

  const handleDownloadQr = async (qrUrl, fileName) => {
    if (!qrUrl) return;

    const fullUrl = getImageUrl(qrUrl);
    try {
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Cập Nhật Bàn</h1>
        <button onClick={handleOpenAddModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PlusCircle size={20} /> Thêm Bàn Mới
        </button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải dữ liệu...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-light)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Tên Bàn</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Sức Chứa</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Vị Trí</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Tiền Cọc Mặc Định</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Hình Ảnh View</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Mã QR</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Trạng Thái</th>
                <th style={{ padding: '1rem', fontWeight: 'bold', textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {tables.map(table => (
                <tr key={table.id_ban} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{table.tenBan}</td>
                  <td style={{ padding: '1rem' }}>{table.sucChua} người</td>
                  <td style={{ padding: '1rem' }}>{table.viTri}</td>
                  <td style={{ padding: '1rem' }}>
                    {table.tienCocMacDinh > 0 ? (
                      <span style={{ fontWeight: 'bold', color: '#f97316' }}>
                        {Number(table.tienCocMacDinh).toLocaleString('vi-VN')} ₫
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Miễn cọc</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {table.hinhAnh ? (
                      <img src={getImageUrl(table.hinhAnh)} alt="View" style={{ width: '80px', height: '55px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} />
                    ) : (
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <ImageIcon size={16} /> Chưa có
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {table.maQR_url ? (
                      <button
                        type="button"
                        onClick={() => handleOpenQrPreview(table)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                      >
                        <img src={getImageUrl(table.maQR_url)} alt={`QR ${table.tenBan}`} style={{ width: '64px', height: '64px', objectFit: 'contain', borderRadius: '8px', background: 'white', border: '1px solid var(--border)' }} />
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text)' }}>
                            <QrCode size={14} /> Quét để mở menu
                          </div>
                          <div style={{ marginTop: '0.2rem' }}>Bấm để phóng to</div>
                        </div>
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Đang tạo...</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '1rem',
                      fontSize: '0.875rem',
                      background: table.trangThai === 'Trống' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: table.trangThai === 'Trống' ? '#10b981' : '#ef4444'
                    }}>
                      {table.trangThai}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => handleOpenEditModal(table)} style={{ padding: '0.5rem', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '0.5rem', cursor: 'pointer' }}>
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(table.id_ban)}
                        style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {tables.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Không có bàn nào trong hệ thống.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Thêm/Sửa Bàn */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '580px', maxHeight: '92vh', overflowY: 'auto', padding: '2.5rem', position: 'relative', borderRadius: '16px' }}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'var(--surface-light)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} />
            </button>

            <h2 style={{ marginTop: 0, marginBottom: '0.25rem', fontSize: '1.6rem' }}>
              {isEditing ? '✏️ Sửa Thông Tin Bàn' : '➕ Thêm Bàn Mới'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.75rem', marginTop: 0 }}>
              Điền thông tin bên dưới để {isEditing ? 'cập nhật' : 'tạo'} bàn trong hệ thống. Mã QR sẽ được tạo tự động để khách quét vào trang gọi món theo bàn.
            </p>

            {/* CSS nội tuyến cho label/input style */}
            <style>{`
              .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
              .form-label { font-weight: 600; font-size: 0.9rem; color: var(--text); }
              .form-input {
                padding: 0.85rem 1rem;
                border: 1.5px solid var(--border);
                border-radius: 10px;
                background: var(--surface-light);
                color: var(--text);
                font-size: 1rem;
                width: 100%;
                box-sizing: border-box;
                transition: border-color 0.2s, box-shadow 0.2s;
                outline: none;
              }
              .form-input:focus {
                border-color: var(--primary);
                box-shadow: 0 0 0 3px rgba(249,115,22,0.15);
              }
              .form-input::placeholder { color: #9ca3af; }
            `}</style>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>

              {/* Tên bàn */}
              <div className="form-group">
                <label className="form-label">Tên Bàn <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" className="form-input" value={formData.tenBan}
                  onChange={e => setFormData({ ...formData, tenBan: e.target.value })}
                  required placeholder="VD: Bàn 01, Bàn VIP 2, Bàn Sân Thượng..." />
              </div>

              {/* Sức chứa & Tiền cọc & Trạng thái */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Sức Chứa (Người) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="number" className="form-input" value={formData.sucChua}
                    onChange={e => setFormData({ ...formData, sucChua: parseInt(e.target.value) })}
                    required min="1" placeholder="VD: 4" />
                </div>
                <div className="form-group">
                  <label className="form-label">Trạng Thái</label>
                  <select
                    className="form-input"
                    value={formData.trangThai}
                    onChange={e => setFormData({ ...formData, trangThai: e.target.value })}
                  >
                    <option value="Trống">Trống</option>
                    <option value="Có khách">Có khách</option>
                    <option value="Đã đặt">Đã đặt</option>
                    <option value="Đang dọn dẹp">Đang dọn dẹp</option>
                    <option value="Bảo trì">Bảo trì</option>
                  </select>
                </div>
              </div>

              {/* Tiền cọc mặc định */}
              <div className="form-group">
                <label className="form-label">Tiền Cọc Mặc Định (VNĐ)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.tienCocMacDinh}
                    onChange={e => setFormData({ ...formData, tienCocMacDinh: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="10000"
                    placeholder="0 = miễn cọc"
                    style={{ paddingRight: '3rem' }}
                  />
                  <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>₫</span>
                </div>
                {formData.tienCocMacDinh > 0 && (
                  <p style={{ fontSize: '0.8rem', color: '#f97316', margin: '0.25rem 0 0' }}>
                    Khách đặt bàn này sẽ được yêu cầu đặt cọc: <strong>{Number(formData.tienCocMacDinh).toLocaleString('vi-VN')} ₫</strong>
                  </p>
                )}
                {formData.tienCocMacDinh === 0 && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                    Để 0 nếu không yêu cầu đặt cọc.
                  </p>
                )}
              </div>

              {/* Vị trí */}
              <div className="form-group">
                <label className="form-label">Vị Trí</label>
                <input
                  list="viTri-options"
                  className="form-input"
                  value={formData.viTri}
                  onChange={e => setFormData({ ...formData, viTri: e.target.value })}
                  placeholder="Chọn hoặc nhập vị trí bàn..."
                />
                <datalist id="viTri-options">
                  <option value="Tầng 1" />
                  <option value="Tầng 2" />
                  <option value="Tầng 3" />
                  <option value="Ngoài trời" />
                  <option value="View biển" />
                  <option value="Sân thượng" />
                  <option value="Phòng VIP" />
                </datalist>
              </div>

              {/* Upload ảnh */}
              <div className="form-group">
                <label className="form-label">Hình Ảnh View của Bàn</label>

                {imagePreview && (
                  <div style={{ marginBottom: '0.75rem', position: 'relative' }}>
                    <img src={imagePreview} alt="Preview"
                      style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '10px', border: '1.5px solid var(--border)' }} />
                    <button type="button"
                      onClick={() => { setImagePreview(''); setFormData(prev => ({ ...prev, hinhAnh: '' })); }}
                      style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.65)', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={16} />
                    </button>
                  </div>
                )}

                <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                <button type="button"
                  onClick={() => fileInputRef.current.click()}
                  disabled={uploading}
                  style={{
                    width: '100%', padding: '1rem', border: '2px dashed var(--border)',
                    borderRadius: '10px', background: 'var(--surface-light)', cursor: uploading ? 'not-allowed' : 'pointer',
                    color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '0.6rem', fontSize: '0.95rem', boxSizing: 'border-box'
                  }}
                >
                  <Upload size={20} />
                  {uploading ? 'Đang tải ảnh lên...' : (imagePreview ? ' Chọn ảnh khác' : 'Nhấn để chọn ảnh từ máy tính')}
                </button>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>
                  Hỗ trợ JPG, PNG, WEBP · Tối đa 5MB
                </p>
              </div>

              <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(249, 115, 22, 0.08)', border: '1px solid rgba(249, 115, 22, 0.18)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Mã QR menu sẽ được sinh tự động sau khi lưu bàn. Quét QR sẽ mở trang gọi món kèm số bàn tương ứng.
              </div>

              {/* Nút hành động */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline" style={{ padding: '0.75rem 1.5rem' }}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={uploading} style={{ padding: '0.75rem 2rem' }}>
                  {uploading ? 'Đang xử lý...' : (isEditing ? ' Lưu Thay Đổi' : 'Tạo Bàn Mới')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedQrTable && (
        <div
          onClick={handleCloseQrPreview}
          style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '460px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 25px 60px rgba(0,0,0,0.45)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.35rem' }}>{selectedQrTable.tenBan}</h2>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  QR menu của bàn #{selectedQrTable.id_ban}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseQrPreview}
                style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'var(--surface-light)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: 'white', borderRadius: '1rem', padding: '1rem', border: '1px solid var(--border)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <img
                src={getImageUrl(selectedQrTable.maQR_url)}
                alt={`QR ${selectedQrTable.tenBan}`}
                style={{ width: '100%', maxWidth: '340px', aspectRatio: '1 / 1', objectFit: 'contain' }}
              />
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button type="button" onClick={handleCloseQrPreview} className="btn btn-outline" style={{ padding: '0.75rem 1.25rem' }}>
                Đóng
              </button>
              <button
                type="button"
                onClick={() => handleDownloadQr(selectedQrTable.maQR_url, `QR-Ban-${selectedQrTable.id_ban}.png`)}
                className="btn btn-primary"
                style={{ padding: '0.75rem 1.25rem' }}
              >
                Lưu QR về máy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTables;

