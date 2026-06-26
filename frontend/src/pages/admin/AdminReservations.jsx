import React, { useState, useEffect, useMemo } from 'react';
import api from '../../utils/axiosSetup';
import { Eye, X, Calendar, User, Info, DollarSign, Table, Search, GitMerge, Trash2 } from 'lucide-react';

import ReservationFilters from './reservations/ReservationFilters';
import ReservationTable from './reservations/ReservationTable';

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

  // Admin cancel modal state
  const [cancelAdminModal, setCancelAdminModal] = useState(null); // reservation
  const [cancelAdminReason, setCancelAdminReason] = useState('');
  const [cancelAdminLoading, setCancelAdminLoading] = useState(false);
  const [cancelAdminError, setCancelAdminError] = useState('');

  // Ghép bàn state
  const [mergeModal, setMergeModal] = useState(null);        // reservation đang mở modal ghép bàn
  const [rooftopTables, setRooftopTables] = useState([]);    // bàn tầng thượng từ API
  const [rooftopLoading, setRooftopLoading] = useState(false);
  const [selectedTables, setSelectedTables] = useState([]);  // ban_ids đã tick
  const [mergeNote, setMergeNote] = useState('');
  const [mergeSoNguoi, setMergeSoNguoi] = useState(1);       // số người mới
  const [mergeLoading, setMergeLoading] = useState(false);
  const [activeMerges, setActiveMerges] = useState({});      // { id_datBan: merge_info }

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

  const fetchActiveMerges = async () => {
    try {
      const res = await api.get(`${BASE_URL}/api/ghepban/`);
      const map = {};
      (res.data || []).forEach(m => { map[m.id_datBan] = m; });
      setActiveMerges(map);
    } catch (e) {
      console.error('Lỗi tải ghép bàn:', e);
    }
  };

  useEffect(() => {
    fetchReservations();
    fetchActiveMerges();
  }, []);

  const handleOpenMergeModal = async (res) => {
    setMergeModal(res);
    setMergeSoNguoi(res.soNguoi || 1);
    setSelectedTables([]);
    setMergeNote('');
    setRooftopLoading(true);
    try {
      const resp = await api.get(`${BASE_URL}/api/ghepban/tables`, {
        params: { thoiGianDen: res.thoiGianDen, id_datBan: res.id_datBan },
      });
      setRooftopTables(resp.data || []);
    } catch (e) {
      console.error(e);
      setRooftopTables([]);
    } finally {
      setRooftopLoading(false);
    }
  };

  const handleToggleTable = (id_ban) => {
    setSelectedTables(prev =>
      prev.includes(id_ban) ? prev.filter(x => x !== id_ban) : [...prev, id_ban]
    );
  };

  const handleSubmitMerge = async () => {
    if (!mergeModal || selectedTables.length === 0) return;
    setMergeLoading(true);
    try {
      await api.post(`${BASE_URL}/api/ghepban/${mergeModal.id_datBan}`, {
        ban_ids: selectedTables,
        ghi_chu: mergeNote || null,
        so_nguoi_moi: mergeSoNguoi,
      });
      setMergeModal(null);
      await fetchActiveMerges();
      await fetchReservations();
    } catch (e) {
      alert(e.response?.data?.detail || 'Không thể ghép bàn. Vui lòng thử lại.');
    } finally {
      setMergeLoading(false);
    }
  };

  const handleCancelMerge = async (id_datBan) => {
    if (!window.confirm('Bạn có chắc muốn hủy ghép bàn này không?')) return;
    try {
      await api.delete(`${BASE_URL}/api/ghepban/${id_datBan}`);
      await fetchActiveMerges();
      await fetchReservations();
    } catch (e) {
      alert(e.response?.data?.detail || 'Không thể hủy ghép bàn.');
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.put(`${BASE_URL}/api/datban/${id}/status`, { trangThai: newStatus });
      fetchReservations();
    } catch (e) {
      alert(e.response?.data?.detail || 'Có lỗi xảy ra khi cập nhật.');
    }
  };

  const handleAdminCancelConfirm = async () => {
    if (!cancelAdminReason.trim()) { setCancelAdminError('Vui lòng nhập lý do hủy.'); return; }
    setCancelAdminLoading(true);
    setCancelAdminError('');
    try {
      await api.put(`${BASE_URL}/api/datban/${cancelAdminModal.id_datBan}/status`, {
        trangThai: 'Đã hủy',
        lyDoHuy: cancelAdminReason.trim(),
      });
      setCancelAdminModal(null);
      setCancelAdminReason('');
      fetchReservations();
    } catch (e) {
      setCancelAdminError(e.response?.data?.detail || 'Không thể hủy đơn. Vui lòng thử lại.');
    } finally {
      setCancelAdminLoading(false);
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
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Cập nhật đặt bàn</h1>
          <ReservationFilters 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            statusOptions={statusOptions}
          />
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải dữ liệu…</div>
      ) : (
        <ReservationTable
          currentItems={currentItems}
          filtered={filtered}
          indexOfFirstItem={indexOfFirstItem}
          indexOfLastItem={indexOfLastItem}
          totalPages={totalPages}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          STATUS_STYLE={STATUS_STYLE}
          COC_STYLE={COC_STYLE}
          fmt={fmt}
          fmtMoney={fmtMoney}
          handleViewDetail={handleViewDetail}
          handleCancelMerge={handleCancelMerge}
          handleOpenMergeModal={handleOpenMergeModal}
          handleUpdateStatus={handleUpdateStatus}
          setCancelAdminModal={setCancelAdminModal}
          setCancelAdminReason={setCancelAdminReason}
          setCancelAdminError={setCancelAdminError}
          setNoShowModal={setNoShowModal}
          setNoShowReason={setNoShowReason}
          setNoShowOrderData={setNoShowOrderData}
          setNoShowOrderLoading={setNoShowOrderLoading}
          activeMerges={activeMerges}
        />
      )}



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
                const isCancelled = detailModal.trangThai === 'Đã hủy';
                const isNoShow = detailModal.trangThai === 'Vắng mặt';
                if ((!isCancelled && !isNoShow) || !detailModal.tienCoc) return null;

                const deposit = Number(detailModal.tienCoc || 0);
                const billTotal = linkedOrderData && linkedOrderData.chi_tiet
                  ? linkedOrderData.chi_tiet.reduce((s, i) => s + i.giaTaiThoiDiemBan * i.soLuong, 0)
                  : 0;

                const isPaidFull = billTotal > 0 && deposit >= billTotal * 0.85;
                const penaltyAmt = isPaidFull ? Math.ceil(billTotal * 0.1) + 50000 : deposit;
                const refundableAmount = isPaidFull ? Math.max(0, deposit - penaltyAmt) : 0;

                if (isPaidFull && refundableAmount > 0) {
                  return (
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', background: 'rgba(59,130,246,0.1)', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid rgba(59,130,246,0.2)', gridColumn: '1 / -1' }}>
                      <DollarSign size={18} style={{ color: '#3b82f6', marginTop: '0.15rem' }} />
                      <div>
                        <div style={{ fontSize: '0.78rem', color: '#3b82f6' }}>↩ Tiền có thể hoàn lại</div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#1d4ed8' }}>{fmtMoney(refundableAmount)}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          (Hoàn phần còn lại sau khi trừ 10% món ăn và phí giữ bàn 50.000đ)
                        </div>
                      </div>
                    </div>
                  );
                }

                // Trường hợp mất cọc hoàn toàn
                if (detailModal.trangThaiCoc === 'Mất cọc' || detailModal.trangThaiCoc === 'Đã cọc') {
                  return (
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', background: 'rgba(239,68,68,0.08)', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid rgba(239,68,68,0.2)', gridColumn: '1 / -1' }}>
                      <DollarSign size={18} style={{ color: '#ef4444', marginTop: '0.15rem' }} />
                      <div>
                        <div style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 700 }}>✕ Mất toàn bộ tiền cọc</div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#dc2626' }}>{fmtMoney(deposit)}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          (Khách không đặt cọc toàn phần bill — áp dụng chính sách mất cọc)
                        </div>
                      </div>
                    </div>
                  );
                }

                return null;
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

      {/* MODAL GHÉP BÀN */}
      {mergeModal && (() => {
        const mergedBans = rooftopTables.filter(t => selectedTables.includes(t.id_ban));
        const totalCapacity = mergedBans.reduce((s, t) => s + t.sucChua, 0);
        const isEnough = totalCapacity >= mergeSoNguoi;
        return (
          <div onClick={() => setMergeModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: '1.25rem', border: '1px solid rgba(124,58,237,0.3)', width: '100%', maxWidth: '540px', padding: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#7c3aed' }}>
                  <GitMerge size={20} /> Ghép bàn #DB{mergeModal.id_datBan}
                </h2>
                <button onClick={() => setMergeModal(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={22} />
                </button>
              </div>

              {/* Info bar */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', background: 'rgba(124,58,237,0.06)', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid rgba(124,58,237,0.15)', fontSize: '0.875rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  👤 <strong>{mergeModal.tenKhachHang || `KH${mergeModal.id_nguoiDung}`}</strong>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  👥 Số khách:
                  <input
                    type="number"
                    min={1}
                    value={mergeSoNguoi}
                    onChange={e => setMergeSoNguoi(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ width: '60px', padding: '0.2rem 0.4rem', borderRadius: '0.35rem', border: '1px solid rgba(124,58,237,0.3)', background: 'var(--surface)', color: 'var(--text-main)', textAlign: 'center', fontWeight: 'bold' }}
                  />
                  người
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  🕐 {new Date(mergeModal.thoiGianDen).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Capacity indicator */}
              <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', background: selectedTables.length === 0 ? 'var(--surface-light)' : isEnough ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${selectedTables.length === 0 ? 'var(--border)' : isEnough ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tổng sức chứa đã chọn:</span>
                <span style={{ fontWeight: 'bold', fontSize: '1rem', color: selectedTables.length === 0 ? 'var(--text-muted)' : isEnough ? '#059669' : '#dc2626' }}>
                  {totalCapacity} / {mergeSoNguoi} người&nbsp;
                  {selectedTables.length > 0 && (isEnough ? '✅ Đủ chỗ' : '❌ Chưa đủ')}
                </span>
              </div>

              {/* Table list */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Bàn Tầng Thượng
                </div>
                {rooftopLoading ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Đang tải danh sách bàn...</div>
                ) : rooftopTables.length === 0 ? (
                  <div style={{ padding: '1.25rem', textAlign: 'center', color: '#ef4444', fontSize: '0.875rem', background: 'rgba(239,68,68,0.05)', borderRadius: '0.5rem', border: '1px solid rgba(239,68,68,0.2)' }}>
                    Không có bàn nào ở Tầng Thượng.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {rooftopTables.map(table => {
                      const isChecked = selectedTables.includes(table.id_ban);
                      const isDisabled = table.coLichTrungGio;
                      return (
                        <label
                          key={table.id_ban}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.75rem 1rem', borderRadius: '0.75rem', cursor: isDisabled ? 'not-allowed' : 'pointer',
                            background: isChecked ? 'rgba(124,58,237,0.08)' : isDisabled ? 'var(--surface-light)' : 'var(--surface-light)',
                            border: `1px solid ${isChecked ? 'rgba(124,58,237,0.4)' : 'var(--border)'}`,
                            opacity: isDisabled ? 0.5 : 1,
                            transition: 'all 0.15s',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isDisabled}
                            onChange={() => !isDisabled && handleToggleTable(table.id_ban)}
                            style={{ width: '16px', height: '16px', accentColor: '#7c3aed' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{table.tenBan}</div>
                            <div style={{ fontSize: '0.77rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                              Sức chứa: {table.sucChua} người · {table.viTri}
                            </div>
                          </div>
                          <span style={{
                            padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 'bold',
                            background: isDisabled ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.1)',
                            color: isDisabled ? '#dc2626' : '#059669',
                          }}>
                            {isDisabled ? 'Trùng giờ' : table.trangThai}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Preview Ghi chú tự động */}
              <div style={{ marginBottom: '1rem', marginTop: '0.5rem', fontSize: '0.78rem', padding: '0.4rem 0.75rem', borderRadius: '0.4rem', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', color: '#7c3aed', fontStyle: 'italic' }}>
                📋 Ghi chú tự động: [GHÉP BÀN] Ghép bàn: {selectedTables.map(id => {
                  const tb = rooftopTables.find(t => t.id_ban === id);
                  return tb ? tb.tenBan : id;
                }).join(', ')} {mergeNote ? `| ${mergeNote}` : ''}
              </div>


              {/* Note */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Ghi chú thêm (tuỳ chọn)</label>
                <input
                  type="text"
                  value={mergeNote}
                  onChange={e => setMergeNote(e.target.value)}
                  placeholder="VD: Khách sinh nhật, cần sắp xếp đặc biệt..."
                  style={{ width: '100%', padding: '0.6rem 0.875rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--surface-light)', color: 'var(--text)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setMergeModal(null)} className="btn btn-outline">Hủy</button>
                <button
                  onClick={handleSubmitMerge}
                  disabled={mergeLoading || selectedTables.length === 0 || !isEnough}
                  style={{
                    padding: '0.6rem 1.5rem', borderRadius: '0.5rem', fontWeight: 'bold', fontSize: '0.875rem', cursor: 'pointer', border: 'none',
                    background: (selectedTables.length === 0 || !isEnough) ? 'var(--surface-light)' : 'linear-gradient(135deg,#7c3aed,#9333ea)',
                    color: (selectedTables.length === 0 || !isEnough) ? 'var(--text-muted)' : '#fff',
                    transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                  }}
                >
                  <GitMerge size={15} />
                  {mergeLoading ? 'Đang xử lý...' : 'Xác nhận ghép bàn'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
      {/* ── Modal Hủy Đơn Admin ── */}
      {cancelAdminModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999, padding: '1rem',
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: '1.25rem',
            padding: '2rem', maxWidth: '480px', width: '100%',
            border: '1px solid rgba(239,68,68,0.3)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f87171', margin: '0 0 0.3rem' }}>
                  🚫 Hủy đơn đặt bàn
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                  #{cancelAdminModal.id_datBan} — {cancelAdminModal.tenKhachHang || `KH${cancelAdminModal.id_nguoiDung}`}
                </p>
              </div>
              <button onClick={() => setCancelAdminModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '0.2rem' }}>✕</button>
            </div>

            {/* Thông tin đơn */}
            <div style={{
              padding: '0.85rem 1rem', borderRadius: '0.85rem', marginBottom: '1.25rem',
              background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)',
              display: 'grid', gap: '0.3rem', fontSize: '0.85rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Bàn</span>
                <strong>{cancelAdminModal.tenBan || `Bàn ${cancelAdminModal.id_ban}` || 'Chưa xếp'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Giờ đặt</span>
                <strong>{fmt(cancelAdminModal.thoiGianDen)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Trạng thái</span>
                <strong>{cancelAdminModal.trangThai}</strong>
              </div>
              {cancelAdminModal.tienCoc > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(239,68,68,0.1)' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 600 }}>⚠️ Tiền cọc</span>
                  <strong style={{ color: cancelAdminModal.trangThaiCoc === 'Đã cọc' ? '#fbbf24' : '#9ca3af' }}>
                    {fmtMoney(cancelAdminModal.tienCoc)} ({cancelAdminModal.trangThaiCoc})
                  </strong>
                </div>
              )}
            </div>

            {/* Lý do hủy */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.45rem', color: 'var(--text-muted)' }}>
                Lý do hủy <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                rows={3}
                value={cancelAdminReason}
                onChange={e => { setCancelAdminReason(e.target.value); setCancelAdminError(''); }}
                placeholder="Nhập lý do hủy để thông báo tới khách hàng..."
                style={{
                  width: '100%', borderRadius: '0.75rem',
                  padding: '0.75rem 1rem', fontSize: '0.9rem',
                  border: cancelAdminError ? '1.5px solid #f87171' : '1px solid var(--border)',
                  background: 'var(--surface-light)', color: 'var(--text)',
                  resize: 'vertical', outline: 'none', fontFamily: 'inherit',
                  boxSizing: 'border-box', lineHeight: 1.5,
                }}
              />
              {cancelAdminError && (
                <div style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '0.3rem' }}>{cancelAdminError}</div>
              )}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setCancelAdminModal(null)}
                disabled={cancelAdminLoading}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '0.75rem',
                  border: '1px solid var(--border)', background: 'var(--surface-light)',
                  color: 'var(--text)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
                  opacity: cancelAdminLoading ? 0.6 : 1,
                }}
              >
                Quay lại
              </button>
              <button
                onClick={handleAdminCancelConfirm}
                disabled={cancelAdminLoading}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '0.75rem', border: 'none',
                  background: cancelAdminLoading ? '#7f1d1d' : 'linear-gradient(135deg,#ef4444,#b91c1c)',
                  color: '#fff', fontWeight: 700,
                  cursor: cancelAdminLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  boxShadow: '0 4px 16px rgba(239,68,68,0.3)',
                  opacity: cancelAdminLoading ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {cancelAdminLoading ? 'Đang hủy...' : '✕ Xác nhận hủy đơn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReservations;
