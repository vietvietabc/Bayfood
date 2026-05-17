import React, { useState, useEffect } from 'react';
import api from '../../utils/axiosSetup';

const AdminReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('Tất cả');

  const fetchReservations = async () => {
    try {
      const response = await api.get('http://localhost:8000/api/datban/all/list');
      setReservations(response.data);
    } catch (error) {
      console.error('Lỗi tải danh sách đặt bàn', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.put(`http://localhost:8000/api/datban/${id}/status`, { trangThai: newStatus });
      fetchReservations();
    } catch (error) {
      alert('Có lỗi xảy ra khi cập nhật.');
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Chờ xác nhận': return { bg: 'rgba(234, 179, 8, 0.1)', color: '#eab308' };
      case 'Đã xác nhận': return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
      case 'Đã checkin': return { bg: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed' };
      case 'Hoàn thành': return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' };
      case 'Đã hủy': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' };
      default: return { bg: 'var(--surface-light)', color: 'var(--text-muted)' };
    }
  };

  const filtered = filterStatus === 'Tất cả'
    ? reservations
    : reservations.filter(r => r.trangThai === filterStatus);

  const statusOptions = ['Tất cả', 'Chờ xác nhận', 'Đã xác nhận', 'Đã checkin', 'Hoàn thành', 'Đã hủy'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Cập nhật đặt bàn</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {statusOptions.map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: filterStatus === s ? 'bold' : 'normal',
                background: filterStatus === s ? 'var(--primary)' : 'transparent',
                color: filterStatus === s ? 'white' : 'var(--text-muted)',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải dữ liệu…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-light)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Mã Đơn</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Mã Khách</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Mã Bàn</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Thời Gian Đến</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Đến Thực Tế</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Số Người</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Ghi Chú</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Trạng Thái</th>
                <th style={{ padding: '1rem', fontWeight: 'bold', textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(res => {
                const statusStyle = getStatusStyle(res.trangThai);
                return (
                  <tr key={res.id_datBan} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>#DB{res.id_datBan}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>KH{res.id_nguoiDung}</td>
                    <td style={{ padding: '1rem' }}>{res.id_ban ? `Bàn ${res.id_ban}` : 'Chưa xếp'}</td>
                    <td style={{ padding: '1rem' }} suppressHydrationWarning>
                      {new Date(res.thoiGianDen).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '1rem' }} suppressHydrationWarning>
                      {res.thoiGianDenThucTe ? new Date(res.thoiGianDenThucTe).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td style={{ padding: '1rem' }}>{res.soNguoi} người</td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{res.ghiChu || '-'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '1rem',
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                        background: statusStyle.bg,
                        color: statusStyle.color
                      }}>
                        {res.trangThai}
                      </span>
                      {res.trangThai === 'Đã checkin' && (
                        <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#7c3aed', fontWeight: 'bold' }}>
                          Khách đã tới bàn
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {res.trangThai === 'Chờ xác nhận' && (
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleUpdateStatus(res.id_datBan, 'Đã xác nhận')}
                            style={{ padding: '0.4rem 0.875rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid #10b981', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                          >
                            Xác nhận
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(res.id_datBan, 'Đã hủy')}
                            style={{ padding: '0.4rem 0.875rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                          >
                            Hủy
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Không có đơn đặt bàn nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminReservations;
