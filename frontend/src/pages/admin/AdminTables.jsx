import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/axiosSetup';
import { PlusCircle, Edit, Trash2, X, Upload, ImageIcon, QrCode, Calendar, Clock, Users, CheckCircle, LayoutList, Map as MapIcon } from 'lucide-react';

import TableCard from './tables/TableCard';

const TableTimeline = ({ timelineData }) => {
  if (!timelineData || !timelineData.tables) return null;
  const { tables } = timelineData;

  // Dùng khung giờ mặc định 7:00 - 24:00
  const startHour = 7;
  const endHour = 24;

  const hours = [];
  for (let h = startHour; h <= endHour; h++) {
    hours.push(h);
  }

  const calculatePosition = (timeStr) => {
    const d = new Date(timeStr);
    let h = d.getHours() + d.getMinutes() / 60;
    if (h < startHour && endHour > 24) h += 24; // next day
    const offset = h - startHour;
    const left = (offset / (endHour - startHour)) * 100;
    return Math.max(0, Math.min(100, left));
  };

  const getStatusColor = (trangThai) => {
    switch (trangThai) {
      case 'Chờ xác nhận': return { bg: 'rgba(234,179,8,0.2)', border: '#f59e0b', color: '#b45309' };
      case 'Đã xác nhận': return { bg: 'rgba(59,130,246,0.2)', border: '#3b82f6', color: '#1d4ed8' };
      case 'Đã checkin': return { bg: 'rgba(16,185,129,0.2)', border: '#10b981', color: '#047857' };
      case 'Đã đặt': return { bg: 'rgba(59,130,246,0.2)', border: '#3b82f6', color: '#1d4ed8' };
      default: return { bg: 'rgba(156,163,175,0.2)', border: '#9ca3af', color: '#374151' };
    }
  };

  return (
    <div style={{ minWidth: '800px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Header (Hours) */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem', marginLeft: '180px' }}>
        {hours.map((h, i) => (
          <div key={h} style={{ flex: i === hours.length - 1 ? '0 0 1px' : 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: '-15px', width: '30px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {h >= 24 ? h - 24 : h}:00
            </span>
            <div style={{ position: 'absolute', left: 0, top: '100%', height: 'calc(100vh - 300px)', minHeight: '300px', borderLeft: '1px dashed var(--border)', zIndex: 0, opacity: 0.5, marginTop: '8px' }} />
          </div>
        ))}
      </div>

      {/* Rows */}
      {tables.map(tableRow => (
        <div key={tableRow.table.id_ban} style={{ display: 'flex', borderBottom: '1px solid var(--border)', minHeight: '70px', alignItems: 'center' }}>
          {/* Left Column */}
          <div style={{ width: '180px', flexShrink: 0, padding: '0.75rem', background: 'var(--surface-light)', borderRight: '1px solid var(--border)', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--text-main)' }}>{tableRow.table.tenBan}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              <Users size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} />
              {tableRow.table.sucChua} người • {tableRow.table.viTri}
            </div>
          </div>

          {/* Timeline Track */}
          <div style={{ flex: 1, position: 'relative', height: '44px', margin: '0.5rem 0' }}>
            {tableRow.reservations.map(res => {
              const left = calculatePosition(res.thoiGianDen);
              const right = calculatePosition(res.thoiGianKetThuc);
              let width = right - left;
              if (width < 2) width = 2; // minimum width
              const style = getStatusColor(res.trangThai);

              if (width <= 0) return null;

              return (
                <div key={res.id_datBan}
                  title={`Đơn #${res.id_datBan}\nTrạng thái: ${res.trangThai}\nSố người: ${res.soNguoi}\nTừ: ${new Date(res.thoiGianDen).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} đến ${new Date(res.thoiGianKetThuc).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
                  style={{
                    position: 'absolute',
                    left: `${left}%`,
                    width: `${width}%`,
                    height: '100%',
                    background: style.bg,
                    border: `1px solid ${style.border}`,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: style.color,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    cursor: 'help',
                    padding: '0 6px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    zIndex: 2,
                    transition: 'transform 0.1s',
                  }}>
                  {width > 8 ? res.trangThai : (width > 4 ? '...' : '')}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

// ===== FLOOR PLAN 2D VIEW =====
const STATUS_COLORS = {
  'Trống': { bg: 'rgba(16,185,129,0.1)', border: '#10b981', text: '#059669', dot: '#10b981', label: 'Trống' },
  'Có khách': { bg: 'rgba(239,68,68,0.1)', border: '#ef4444', text: '#dc2626', dot: '#ef4444', label: 'Có khách' },
  'Đã đặt': { bg: 'rgba(245,158,11,0.12)', border: '#f59e0b', text: '#b45309', dot: '#f59e0b', label: 'Đã đặt' },
  'Bảo trì': { bg: 'rgba(107,114,128,0.1)', border: '#9ca3af', text: '#6b7280', dot: '#9ca3af', label: 'Bảo trì' },
  'Đang dọn': { bg: 'rgba(99,102,241,0.1)', border: '#6366f1', text: '#4f46e5', dot: '#6366f1', label: 'Đang dọn' },
};

const getTableStatus = (table, timelineData) => {
  // Check if table has active reservation in timeline
  if (timelineData && timelineData.tables) {
    const now = new Date();
    const tableTimeline = timelineData.tables.find(t => t.table.id_ban === table.id_ban);
    if (tableTimeline) {
      const hasActive = tableTimeline.reservations.some(r => {
        const start = new Date(r.thoiGianDen);
        const end = new Date(r.thoiGianKetThuc);
        return now >= start && now <= end && (r.trangThai === 'Đã checkin' || r.trangThai === 'Đã xác nhận' || r.trangThai === 'Đã đặt');
      });
      const hasUpcoming = tableTimeline.reservations.some(r => new Date(r.thoiGianDen) > now && r.trangThai !== 'Hủy');
      if (hasActive) return 'Đã đặt';
      if (hasUpcoming) return 'Đã đặt';
    }
  }
  if (table.trangThai === 'Bảo trì') return 'Bảo trì';
  if (table.trangThai === 'Đang dọn') return 'Đang dọn';
  if (table.trangThai === 'Có khách') return 'Có khách';
  return 'Trống';
};

const TableFloorPlanView = ({ tables, timelineData, timelineLoading, onEdit, getImageUrl, BACKEND_URL }) => {
  const [hoveredTable, setHoveredTable] = useState(null);

  // Group tables by viTri
  const grouped = tables.reduce((acc, t) => {
    const key = t.viTri || 'Khác';
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  const statusSummary = {
    trong: tables.filter(t => getTableStatus(t, timelineData) === 'Trống').length,
    datTruoc: tables.filter(t => getTableStatus(t, timelineData) === 'Đã đặt').length,
    coKhach: tables.filter(t => getTableStatus(t, timelineData) === 'Có khách').length,
    baoTri: tables.filter(t => ['Bảo trì', 'Đang dọn'].includes(getTableStatus(t, timelineData))).length,
  };

  return (
    <div>
      {/* Stats Row */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Trống', count: statusSummary.trong, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
          { label: 'Đã có lịch', count: statusSummary.datTruoc, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
          { label: 'Có khách', count: statusSummary.coKhach, color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
          { label: 'Bảo trì', count: statusSummary.baoTri, color: '#9ca3af', bg: 'rgba(156,163,175,0.08)' },
        ].map(s => (
          <div key={s.label} style={{
            padding: '0.75rem 1.25rem', borderRadius: '0.75rem',
            background: s.bg, border: `1px solid ${s.color}30`,
            display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '0 0 auto'
          }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{s.label}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: s.color, lineHeight: 1 }}>{s.count}</div>
          </div>
        ))}
        {timelineLoading && (
          <div style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}>
            ⏳ Đang làm mới trạng thái...
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', fontSize: '0.8rem' }}>
        {Object.entries(STATUS_COLORS).map(([key, val]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: val.bg, border: `1.5px solid ${val.border}` }} />
            <span style={{ color: 'var(--text-muted)' }}>{val.label}</span>
          </div>
        ))}
      </div>

      {/* Areas */}
      {Object.entries(grouped).map(([area, areaTables]) => (
        <div key={area} style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem'
          }}>
            <div style={{ height: '1px', flex: 1, background: 'var(--border)' }} />
            <span style={{
              padding: '0.35rem 1rem', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: 700,
              background: 'var(--surface-light)', color: 'var(--text-muted)', border: '1px solid var(--border)',
              whiteSpace: 'nowrap'
            }}>
              {area}
            </span>
            <div style={{ height: '1px', flex: 1, background: 'var(--border)' }} />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            {areaTables.map(table => {
              const status = getTableStatus(table, timelineData);
              const sc = STATUS_COLORS[status] || STATUS_COLORS['Trống'];
              const isHovered = hoveredTable === table.id_ban;

              return (
                <TableCard
                  key={table.id_ban}
                  table={table}
                  status={status}
                  isHovered={isHovered}
                  sc={sc}
                  onMouseEnter={() => setHoveredTable(table.id_ban)}
                  onMouseLeave={() => setHoveredTable(null)}
                  onEdit={onEdit}
                  getImageUrl={getImageUrl}
                />
              );
            })}
          </div>
        </div>
      ))}

      {tables.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          Chưa có bàn nào trong hệ thống.
        </div>
      )}
    </div>
  );
};

const AdminTables = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedQrTable, setSelectedQrTable] = useState(null);
  const fileInputRef = useRef(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Timeline states
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'floorplan' | 'timeline'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [timelineData, setTimelineData] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

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

  const fetchTimeline = async (dateStr) => {
    setTimelineLoading(true);
    try {
      const response = await api.get(`/api/datban/timeline?ngay=${dateStr}`);
      setTimelineData(response.data);
    } catch (error) {
      console.error('Lỗi tải timeline', error);
    } finally {
      setTimelineLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (viewMode === 'timeline' || viewMode === 'floorplan') {
      fetchTimeline(selectedDate);
    }
  }, [viewMode, selectedDate]);

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

  const handleResetQr = async (id_ban) => {
    if (window.confirm("Làm mới mã QR sẽ khiến ảnh QR cũ khách đã chụp bị vô hiệu hóa. Bạn có chắc chắn muốn làm mới không?")) {
      try {
        const response = await api.post(`/api/ban/${id_ban}/reset-qr`);
        alert("Làm mới mã QR thành công!");
        setSelectedQrTable(response.data); // Update modal image
        fetchTables(); // Update table list in background
      } catch (error) {
        alert("Có lỗi xảy ra: " + (error.response?.data?.detail || error.message));
      }
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Cập Nhật Bàn</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* View Toggle */}
          <div style={{ display: 'flex', background: 'var(--surface-card)', borderRadius: 'var(--rounded-pill)', padding: '4px', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '0.5rem 1rem', border: 'none', borderRadius: 'var(--rounded-pill)',
                background: viewMode === 'list' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'list' ? '#fff' : 'var(--text-muted)',
                fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                fontSize: '0.85rem', transition: 'all 0.2s'
              }}
            >
              <LayoutList size={16} /> Danh sách
            </button>
            <button
              onClick={() => setViewMode('floorplan')}
              style={{
                padding: '0.5rem 1rem', border: 'none', borderRadius: 'var(--rounded-pill)',
                background: viewMode === 'floorplan' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'floorplan' ? '#fff' : 'var(--text-muted)',
                fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                fontSize: '0.85rem', transition: 'all 0.2s'
              }}
            >
              <MapIcon size={16} /> Sơ đồ bàn
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              style={{
                padding: '0.5rem 1rem', border: 'none', borderRadius: 'var(--rounded-pill)',
                background: viewMode === 'timeline' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'timeline' ? '#fff' : 'var(--text-muted)',
                fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                fontSize: '0.85rem', transition: 'all 0.2s'
              }}
            >
              <Calendar size={16} /> Sơ đồ lịch
            </button>
          </div>

          {(viewMode === 'timeline' || viewMode === 'floorplan') && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: '0.65rem 1rem', borderRadius: 'var(--rounded-pill)', border: '1px solid var(--border)',
                background: 'var(--surface-card)', color: 'var(--text-main)', outline: 'none',
                fontFamily: 'inherit', fontSize: '0.9rem', cursor: 'pointer'
              }}
            />
          )}

          {viewMode === 'list' && (
            <button onClick={handleOpenAddModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PlusCircle size={20} /> Thêm Bàn Mới
            </button>
          )}
        </div>
      </div>

      {viewMode === 'floorplan' ? (
        <TableFloorPlanView
          tables={tables}
          timelineData={timelineData}
          timelineLoading={timelineLoading}
          onEdit={handleOpenEditModal}
          getImageUrl={getImageUrl}
          BACKEND_URL={BACKEND_URL}
        />
      ) : viewMode === 'list' ? (
        <div className="card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải dữ liệu...</div>
          ) : (() => {
            const indexOfLastItem = currentPage * itemsPerPage;
            const indexOfFirstItem = indexOfLastItem - itemsPerPage;
            const currentTables = tables.slice(indexOfFirstItem, indexOfLastItem);
            const totalPages = Math.ceil(tables.length / itemsPerPage);

            return (
              <>
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
                    {currentTables.map(table => (
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

                {/* Pagination UI */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--surface-light)' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Hiển thị {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, tables.length)} trong tổng số {tables.length} bàn
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
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
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
                        ))}
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
              </>
            );
          })()}
        </div>
      ) : (
        /* ===== TIMELINE VIEW - Enhanced ===== */
        <div className="card" style={{ overflow: 'hidden', padding: '1.5rem', overflowX: 'auto' }}>
          {timelineLoading || !timelineData ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Calendar size={36} style={{ opacity: 0.3, marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
              Đang tải sơ đồ lịch...
            </div>
          ) : (
            <TableTimeline timelineData={timelineData} />
          )}
        </div>
      )}

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
                onClick={() => handleResetQr(selectedQrTable.id_ban)}
                className="btn btn-outline"
                style={{ padding: '0.75rem 1.25rem', borderColor: '#ef4444', color: '#ef4444' }}
              >
                Làm Mới QR
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

