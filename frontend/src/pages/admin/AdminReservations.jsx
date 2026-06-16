import React, { useState, useEffect, useMemo } from 'react';
import api from '../../utils/axiosSetup';
import { Eye, X, Calendar, User, Info, DollarSign, Table, Search } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const fmt = (d) => d ? new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
const fmtMoney = (v) => v != null ? Number(v).toLocaleString('vi-VN') + ' ₫' : null;

const STATUS_STYLE = {
  'Chờ xác nhận': { bg: 'rgba(234,179,8,0.12)', color: '#ca8a04' },
  'Đã đặt': { bg: 'rgba(59,130,246,0.12)', color: '#2563eb' },
  'Đã xác nhận': { bg: 'rgba(16,185,129,0.12)', color: '#059669' },
  'Đã checkin': { bg: 'rgba(124,58,237,0.12)', color: '#7c3aed' },
  'Hoàn thành': { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  'Đã hủy': { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  'Vắng mặt': { bg: 'rgba(239,68,68,0.18)', color: '#dc2626' },
};

const COC_STYLE = {
  'Chưa cọc': { bg: 'rgba(234,179,8,0.1)', color: '#ca8a04' },
  'Đã cọc': { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
  'Mất cọc': { bg: 'rgba(239,68,68,0.15)', color: '#dc2626' },
  'Hoàn cọc': { bg: 'rgba(59,130,246,0.1)', color: '#2563eb' },
};

const AdminReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail modal state
  const [detailModal, setDetailModal] = useState(null);
  const [linkedOrderData, setLinkedOrderData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // No-show modal state
  const [noShowModal, setNoShowModal] = useState(null);
  const [noShowReason, setNoShowReason] = useState('Khách không đến đúng giờ');
  const [noShowLoading, setNoShowLoading] = useState(false);
  const [noShowOrderData, setNoShowOrderData] = useState(null);
  const [noShowOrderLoading, setNoShowOrderLoading] = useState(false);
  const TABLE_FEE = 50000;

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchQuery]);

  const fetchReservations = async () => {
    try {
      const res = await api.get(`${BASE_URL}/api/datban/all/list`);
      setReservations(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReservations(); }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.put(`${BASE_URL}/api/datban/${id}/status`, { trangThai: newStatus });
      fetchReservations();
    } catch (e) {
      alert(e.response?.data?.detail || 'Có lỗi xảy ra khi cập nhật.');
    }
  };

  const handleViewDetail = async (res) => {
    setDetailModal(res);
    setLinkedOrderData(null);
    if (res.id_donHang) {
      setDetailLoading(true);
      try {
        const response = await api.get(`${BASE_URL}/api/donhang/${res.id_donHang}/detail`);
        setLinkedOrderData(response.data);
      } catch (e) {
        console.error("Không thể lấy chi tiết đơn hàng liên kết:", e);
      } finally {
        setDetailLoading(false);
      }
    }
  };



  const handleNoShow = async () => {
    setNoShowLoading(true);
    try {
      await api.put(`${BASE_URL}/api/datban/${noShowModal.id_datBan}/no-show`, {
        lyDoHuy: noShowReason,
      });
      setNoShowModal(null);
      fetchReservations();
    } catch (e) {
      alert(e.response?.data?.detail || 'Không thể đánh dấu vắng mặt.');
    } finally {
      setNoShowLoading(false);
    }
  };

  const statusOptions = ['Tất cả', 'Chờ xác nhận', 'Đã xác nhận', 'Đã checkin', 'Vắng mặt', 'Hoàn thành', 'Đã hủy'];
  const filtered = useMemo(() => {
    let list = filterStatus === 'Tất cả' ? reservations : reservations.filter(r => r.trangThai === filterStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        String(r.id_datBan).includes(q) ||
        (r.tenKhachHang || '').toLowerCase().includes(q) ||
        String(r.id_nguoiDung).includes(q) ||
        (r.id_ban ? `bàn ${r.id_ban}` : '').toLowerCase().includes(q) ||
        (r.tenBan || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [reservations, filterStatus, searchQuery]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Quản lý đặt bàn</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm mã đặt bàn, tên khách..."
              style={{
                padding: '0.4rem 0.875rem 0.4rem 2.2rem', borderRadius: '999px',
                border: '1px solid var(--border)', background: 'var(--surface-light)',
                color: 'var(--text)', fontSize: '0.8rem', outline: 'none', width: '200px'
              }}
            />
          </div>
          {/* Status pills */}
          {statusOptions.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: '0.4rem 0.875rem', borderRadius: '999px',
              border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: filterStatus === s ? 'bold' : 'normal',
              background: filterStatus === s ? 'var(--primary)' : 'transparent',
              color: filterStatus === s ? 'white' : 'var(--text-muted)',
            }}>{s}</button>
          ))}
        </div>
      </div>

      <div className="card" style={{ overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải dữ liệu…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-light)', borderBottom: '1px solid var(--border)' }}>
                {['Mã', 'Khách', 'Bàn', 'Giờ đến', 'Đến thực tế', 'Số người', 'Tiền cọc', 'Trạng thái', 'Thao tác'].map(h => (
                  <th key={h} style={{ padding: '0.875rem 1rem', fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentItems.map(res => {
                const ss = STATUS_STYLE[res.trangThai] || { bg: 'var(--surface-light)', color: 'var(--text-muted)' };
                const cs = res.trangThaiCoc ? (COC_STYLE[res.trangThaiCoc] || {}) : null;
                const isPast = res.thoiGianDen && new Date(res.thoiGianDen) < new Date();
                const is3HoursPast = res.thoiGianDen && new Date(new Date(res.thoiGianDen).getTime() + 3 * 60 * 60 * 1000) < new Date();
                const canNoShow = ['Đã xác nhận', 'Chờ xác nhận', 'Đã đặt'].includes(res.trangThai) && is3HoursPast;

                return (
                  <tr key={res.id_datBan} style={{ borderBottom: '1px solid var(--border)', background: res.trangThai === 'Vắng mặt' ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 'bold' }}>#DB{res.id_datBan}</td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--text-muted)' }}>
                      {res.tenKhachHang
                        ? <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{res.tenKhachHang}</span>
                        : <span>KH{res.id_nguoiDung}</span>
                      }
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      {res.tenBan || (res.id_ban ? `Bàn ${res.id_ban}` : <span style={{ color: 'var(--text-muted)' }}>Chưa xếp</span>)}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', whiteSpace: 'nowrap', color: isPast && res.trangThai !== 'Đã checkin' && res.trangThai !== 'Hoàn thành' ? '#ef4444' : 'inherit' }}>{fmt(res.thoiGianDen)}</td>
                    <td style={{ padding: '0.875rem 1rem', whiteSpace: 'nowrap', color: '#059669' }}>{fmt(res.thoiGianDenThucTe)}</td>
                    <td style={{ padding: '0.875rem 1rem' }}>{res.soNguoi} người</td>
                    {/* Tiền cọc */}
                    <td style={{ padding: '0.875rem 1rem', minWidth: '160px' }}>
                      {res.tienCoc ? (
                        <div style={{ display: 'grid', gap: '0.2rem' }}>
                          <div style={{ fontWeight: 'bold', color: res.trangThaiCoc === 'Mất cọc' ? '#dc2626' : res.trangThaiCoc === 'Đã cọc' ? '#059669' : 'var(--text)' }}>
                            {fmtMoney(res.tienCoc)}
                          </div>
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            {cs && (
                              <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '700', background: cs.bg, color: cs.color }}>
                                {res.trangThaiCoc}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Chưa đặt cọc</span>
                      )}
                      {res.lyDoHuy && (
                        <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.25rem', fontStyle: 'italic' }}>
                          {res.lyDoHuy}
                        </div>
                      )}
                    </td>
                    {/* Trạng thái */}
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 'bold', background: ss.bg, color: ss.color, whiteSpace: 'nowrap' }}>
                        {res.trangThai}
                      </span>
                    </td>
                    {/* Thao tác */}
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {/* Chi tiết */}
                        <button onClick={() => handleViewDetail(res)}
                          style={{ padding: '0.35rem 0.75rem', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid #3b82f6', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold' }}>
                          Chi tiết
                        </button>
                        {/* Xác nhận / Hủy */}
                        {res.trangThai === 'Chờ xác nhận' && (
                          <>
                            <button onClick={() => handleUpdateStatus(res.id_datBan, 'Đã xác nhận')}
                              style={{ padding: '0.35rem 0.75rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid #10b981', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold' }}>
                              Xác nhận
                            </button>
                            <button onClick={() => handleUpdateStatus(res.id_datBan, 'Đã hủy')}
                              style={{ padding: '0.35rem 0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold' }}>
                              Hủy
                            </button>
                          </>
                        )}

                        {/* Vắng mặt */}
                        {canNoShow && (
                          <button onClick={() => {
                            setNoShowModal(res);
                            setNoShowReason('Khách không đến đúng giờ');
                            setNoShowOrderData(null);
                            if (res.id_donHang) {
                              setNoShowOrderLoading(true);
                              api.get(`${BASE_URL}/api/donhang/${res.id_donHang}/detail`)
                                .then(r => setNoShowOrderData(r.data))
                                .catch(() => setNoShowOrderData(null))
                                .finally(() => setNoShowOrderLoading(false));
                            }
                          }}
                            style={{ padding: '0.35rem 0.75rem', background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid #dc2626', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold' }}>
                            Vắng mặt
                          </button>
                        )}
                        {/* Hoàn thành */}
                        {res.trangThai === 'Đã checkin' && (
                          <button onClick={() => handleUpdateStatus(res.id_datBan, 'Hoàn thành')}
                            style={{ padding: '0.35rem 0.75rem', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid #3b82f6', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold' }}>
                            Hoàn thành
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Không có đơn đặt bàn nào.</td></tr>
              )}
            </tbody>
          </table>
        )}

        {/* Pagination UI */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--surface-light)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Hiển thị {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filtered.length)} trong tổng số {filtered.length} đặt bàn
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
                  // Hiển thị các trang xung quanh trang hiện tại (tối đa 5 nút)
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



      {/* MODAL CHI TIẾT ĐẶT BÀN & ĐƠN HÀNG */}
      {detailModal && (
        <div onClick={() => setDetailModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: '1.25rem', border: '1px solid var(--border)', width: '100%', maxWidth: '600px', padding: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>

            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Info size={22} style={{ color: 'var(--primary)' }} />
                Chi tiết đặt bàn #DB{detailModal.id_datBan}
              </h2>
              <button onClick={() => setDetailModal(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={24} />
              </button>
            </div>

            {/* Reservation Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', background: 'var(--surface-light)', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                <User size={18} style={{ color: 'var(--text-muted)', marginTop: '0.15rem' }} />
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Khách hàng</div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Mã khách: KH{detailModal.id_nguoiDung}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', background: 'var(--surface-light)', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                <Table size={18} style={{ color: 'var(--text-muted)', marginTop: '0.15rem' }} />
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Bàn ăn được xếp</div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: detailModal.id_ban ? '#059669' : '#ca8a04' }}>
                    {detailModal.id_ban ? `Bàn ${detailModal.id_ban}` : 'Chưa xếp bàn'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', background: 'var(--surface-light)', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                <Calendar size={18} style={{ color: 'var(--text-muted)', marginTop: '0.15rem' }} />
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Thời gian đến hẹn</div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{fmt(detailModal.thoiGianDen)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', background: 'var(--surface-light)', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                <DollarSign size={18} style={{ color: 'var(--text-muted)', marginTop: '0.15rem' }} />
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Thông tin cọc</div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#059669' }}>
                    {detailModal.tienCoc ? fmtMoney(detailModal.tienCoc) : 'Chưa đặt cọc'}
                  </div>
                </div>
              </div>

              {(() => {
                let refundableAmount = null;
                let isFullDeposit = false;
                let penalty = 0;
                if (detailModal.trangThai === 'Vắng mặt' && detailModal.trangThaiCoc === 'Mất cọc' && linkedOrderData && linkedOrderData.chi_tiet) {
                  const billTotal = linkedOrderData.chi_tiet.reduce((s, i) => s + i.giaTaiThoiDiemBan * i.soLuong, 0);
                  if (billTotal > 0 && detailModal.tienCoc >= billTotal) {
                    isFullDeposit = true;
                    penalty = Math.ceil(billTotal * 0.1) + 50000;
                    refundableAmount = Math.max(0, detailModal.tienCoc - penalty);
                  }
                }
                if (!isFullDeposit) return null;
                return (
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', background: 'rgba(59,130,246,0.1)', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid rgba(59,130,246,0.2)', gridColumn: '1 / -1' }}>
                    <DollarSign size={18} style={{ color: '#3b82f6', marginTop: '0.15rem' }} />
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#3b82f6' }}>Tiền có thể nhận lại</div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#1d4ed8' }}>
                        {fmtMoney(refundableAmount)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        (Hoàn phần còn lại sau khi trừ 10% món ăn và phí giữ bàn 50.000đ)
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Note Section */}
            {detailModal.ghiChu && (
              <div style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#ca8a04', fontWeight: 'bold', marginBottom: '0.25rem' }}>Ghi chú của khách:</div>
                <div style={{ fontSize: '0.875rem', fontStyle: 'italic', color: 'var(--text)' }}>"{detailModal.ghiChu}"</div>
              </div>
            )}

            {/* Linked Order Section */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text)' }}>
                Đơn hàng đi kèm
              </h3>

              {!detailModal.id_donHang ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic', background: 'var(--surface-light)', padding: '1rem', borderRadius: '0.75rem', textAlign: 'center', border: '1px solid var(--border)' }}>
                  Không có đơn món ăn đi kèm với đặt bàn này.
                </div>
              ) : detailLoading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem' }}>
                  Đang tải chi tiết đơn hàng...
                </div>
              ) : linkedOrderData ? (
                <div>
                  {/* Order Details Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <strong>Mã đơn:</strong> <span style={{ color: 'var(--primary)' }}>#{linkedOrderData.id_donHang}</span>
                    </div>
                    <div>
                      <strong>Trạng thái đơn:</strong>{' '}
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '1rem',
                        fontSize: '0.78rem',
                        fontWeight: 'bold',
                        background: linkedOrderData.tinhTrang === 'Đã thanh toán' ? 'rgba(16,185,129,0.1)' : 'rgba(249,115,22,0.1)',
                        color: linkedOrderData.tinhTrang === 'Đã thanh toán' ? '#10b981' : '#ea580c'
                      }}>
                        {linkedOrderData.tinhTrang}
                      </span>
                    </div>
                  </div>

                  {/* Food Items list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                    {linkedOrderData.chi_tiet && linkedOrderData.chi_tiet.length > 0 ? (
                      linkedOrderData.chi_tiet.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-light)', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                          <div>
                            <span style={{ fontWeight: 'bold' }}>{item.tenMon || `Món #${item.id_monAn}`}</span>
                            <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>x {item.soLuong}</span>
                          </div>
                          <span style={{ fontWeight: 'bold', color: 'var(--text)' }}>
                            {fmtMoney(item.giaTaiThoiDiemBan * item.soLuong)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>Không có món ăn nào trong đơn hàng.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ color: '#ef4444', fontSize: '0.875rem', fontStyle: 'italic' }}>
                  Không thể lấy thông tin chi tiết của đơn hàng liên kết.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <button onClick={() => setDetailModal(null)} className="btn btn-outline" style={{ padding: '0.5rem 1.5rem' }}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VẮNG MẶT */}
      {noShowModal && (
        <div onClick={() => setNoShowModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: '1rem', border: '1px solid rgba(239,68,68,0.4)', width: '100%', maxWidth: '480px', padding: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#dc2626' }}>Xác nhận khách vắng mặt</h2>
            <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
              <div><strong>Đặt bàn:</strong> #DB{noShowModal.id_datBan} — Bàn {noShowModal.id_ban || 'chưa xếp'}</div>
              <div><strong>Giờ hẹn:</strong> {fmt(noShowModal.thoiGianDen)}</div>
              {noShowModal.tienCoc > 0 && (() => {
                // Tính penalty đúng: nếu khách trả toàn bộ thì chỉ phạt 10% + phí bàn
                let penaltyAmt = noShowModal.tienCoc;
                let refundAmt = 0;
                let isPaidFull = false;
                if (noShowOrderData && noShowOrderData.chi_tiet) {
                  const billTotal = noShowOrderData.chi_tiet.reduce((s, i) => s + i.giaTaiThoiDiemBan * i.soLuong, 0);
                  if (billTotal > 0 && noShowModal.tienCoc >= billTotal * 0.85) {
                    isPaidFull = true;
                    penaltyAmt = Math.ceil(billTotal * 0.1) + 50000;
                    refundAmt = Math.max(0, noShowModal.tienCoc - penaltyAmt);
                  }
                }
                return (
                  <div style={{ marginTop: '0.5rem', color: '#dc2626' }}>
                    {noShowOrderLoading ? (
                      <div style={{ fontSize: '0.82rem', color: '#b91c1c' }}>Đang tính tiền phạt...</div>
                    ) : (
                      <>
                        <div style={{ fontWeight: 'bold' }}>
                          ⚠️ Tiền phạt vắng mặt: <strong>{fmtMoney(penaltyAmt)}</strong>
                        </div>
                        {isPaidFull && refundAmt > 0 && (
                          <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: '0.25rem', fontWeight: '600' }}>
                            ↩ Hoàn lại cho khách: {fmtMoney(refundAmt)}
                          </div>
                        )}
                        <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '0.2rem' }}>
                          {isPaidFull
                            ? `(Phí giữ bàn + 10% bill — phần còn lại ${fmtMoney(refundAmt)} cần hoàn lại)`
                            : '(Khách mất toàn bộ tiền cọc đã đặt)'}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.4rem' }}>Lý do</label>
                <textarea value={noShowReason} onChange={e => setNoShowReason(e.target.value)} rows={3}
                  className="input-field" style={{ width: '100%', resize: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setNoShowModal(null)} className="btn btn-outline">Hủy</button>
              <button onClick={handleNoShow} disabled={noShowLoading}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '0.5rem', background: '#dc2626', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem' }}>
                {noShowLoading ? 'Đang xử lý...' : 'Xác nhận vắng mặt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReservations;
