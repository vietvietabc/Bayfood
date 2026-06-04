import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { ChefHat, Truck, CheckCircle, Eye, X, User, UtensilsCrossed, Star, Search, Filter, AlertCircle } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterZeroAmount, setFilterZeroAmount] = useState(false);
  const [filterDate, setFilterDate] = useState('');

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/donhang/all/list`);
      setOrders(response.data);
    } catch (error) {
      console.error('Lỗi tải đơn hàng', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await axios.put(`${BASE_URL}/api/donhang/${id}/status`, { tinhTrang: newStatus });
      fetchOrders();
    } catch (error) {
      alert('Có lỗi khi cập nhật.');
    }
  };

  const handleViewDetail = async (id) => {
    setDetailLoading(true);
    setShowModal(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/donhang/${id}/detail`);
      setSelectedOrder(response.data);
    } catch (error) {
      console.error('Lỗi tải chi tiết đơn hàng', error);
      alert('Không thể tải chi tiết đơn hàng.');
      setShowModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Chờ khách đến': return { bg: 'rgba(249, 115, 22, 0.1)', color: '#ea580c' };
      case 'Đang chờ món': return { bg: 'rgba(234, 179, 8, 0.1)', color: '#eab308' };
      case 'Đang chế biến': return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' };
      case 'Đã phục vụ': return { bg: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' };
      case 'Đã thanh toán': return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
      case 'Vắng mặt': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' };
      case 'Đã hủy': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' };
      default: return { bg: 'var(--surface-light)', color: 'var(--text-muted)' };
    }
  };

  const getMonStatusColor = (status) => {
    switch (status) {
      case 'Chờ chế biến': return '#eab308';
      case 'Đang chế biến': return '#3b82f6';
      case 'Hoàn thành': return '#10b981';
      default: return 'var(--text-muted)';
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

  const formatDateTime = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const ALL_STATUSES = ['Chờ khách đến', 'Đang chờ món', 'Đang chế biến', 'Đã phục vụ', 'Đã thanh toán', 'Vắng mặt', 'Đã hủy'];

  // Filtered orders computed
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Search by order ID or customer name
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = String(order.id_donHang).includes(q);
        const nameMatch = (order.tenKhachHang || '').toLowerCase().includes(q);
        const tableMatch = (order.tenBan || `Bàn ${order.id_ban}`).toLowerCase().includes(q);
        if (!idMatch && !nameMatch && !tableMatch) return false;
      }
      // Filter status
      if (filterStatus && order.tinhTrang !== filterStatus) return false;
      // Filter zero amount
      if (filterZeroAmount && (order.tongTien || 0) > 0) return false;
      // Filter date
      if (filterDate) {
        const orderDate = new Date(order.thoiGianTao).toISOString().split('T')[0];
        if (orderDate !== filterDate) return false;
      }
      return true;
    });
  }, [orders, searchQuery, filterStatus, filterZeroAmount, filterDate]);

  const hasActiveFilters = searchQuery || filterStatus || filterZeroAmount || filterDate;
  const zeroAmountCount = orders.filter(o => (o.tongTien || 0) === 0).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Cập nhật đơn hàng</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{filteredOrders.length}</span>/{orders.length} đơn
          {zeroAmountCount > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.25rem 0.65rem', borderRadius: '1rem', fontSize: '0.78rem',
              background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 600
            }}>
              <AlertCircle size={13} /> {zeroAmountCount} đơn chưa có món
            </span>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        {/* Search input */}
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm mã đơn, tên khách, bàn..."
            style={{
              width: '100%', padding: '0.6rem 0.85rem 0.6rem 2.4rem',
              borderRadius: '0.5rem', border: '1px solid var(--border)',
              background: 'var(--surface-light)', color: 'var(--text-main)',
              fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{
            padding: '0.6rem 0.85rem', borderRadius: '0.5rem', border: '1px solid var(--border)',
            background: 'var(--surface-light)', color: 'var(--text-main)', fontSize: '0.9rem',
            cursor: 'pointer', outline: 'none', minWidth: '170px'
          }}
        >
          <option value="">Tất cả trạng thái</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Date filter */}
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          title="Lọc theo ngày tạo đơn"
          style={{
            padding: '0.6rem 0.85rem', borderRadius: '0.5rem', border: '1px solid var(--border)',
            background: 'var(--surface-light)', color: 'var(--text-main)', fontSize: '0.9rem',
            cursor: 'pointer', outline: 'none', fontFamily: 'inherit'
          }}
        />

        {/* Zero amount toggle */}
        <button
          onClick={() => setFilterZeroAmount(!filterZeroAmount)}
          style={{
            padding: '0.6rem 1rem', borderRadius: '0.5rem', border: '1px solid',
            borderColor: filterZeroAmount ? '#ef4444' : 'var(--border)',
            background: filterZeroAmount ? 'rgba(239,68,68,0.08)' : 'var(--surface-light)',
            color: filterZeroAmount ? '#ef4444' : 'var(--text-muted)',
            fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s', whiteSpace: 'nowrap'
          }}
        >
          <Filter size={14} /> Tổng tiền = 0
        </button>

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            onClick={() => { setSearchQuery(''); setFilterStatus(''); setFilterZeroAmount(false); setFilterDate(''); }}
            style={{
              padding: '0.6rem 0.85rem', borderRadius: '0.5rem', border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-muted)', fontSize: '0.85rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
              transition: 'all 0.2s'
            }}
          >
            <X size={14} /> Xoá lọc
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải dữ liệu...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-light)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Mã Đơn</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Khách Hàng</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Bàn</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Thời Gian</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Tổng Tiền</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Trạng Thái</th>
                <th style={{ padding: '1rem', fontWeight: 'bold', textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => {
                const statusStyle = getStatusColor(order.tinhTrang);
                const tongTien = order.tongTien || 0;
                return (
                  <tr key={order.id_donHang} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                      #DH{order.id_donHang}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                        {order.tenKhachHang || `KH${order.id_nguoiDung}`}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        ID: {order.id_nguoiDung}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {order.tenBan || (order.id_ban ? `Bàn ${order.id_ban}` : '-')}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.85rem' }}>
                        {formatDateTime(order.thoiGianTao)}
                      </div>
                      {order.thoiGianDen && (
                        <div style={{ fontSize: '0.8rem', color: '#ea580c', fontWeight: 'bold', marginTop: '0.2rem' }}>
                          Đến: {formatDateTime(order.thoiGianDen)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                      {tongTien > 0 ? (
                        <span style={{ color: '#f97316' }}>{formatCurrency(tongTien)}</span>
                      ) : (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                          padding: '0.2rem 0.6rem', borderRadius: '0.75rem', fontSize: '0.8rem',
                          background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontWeight: 600
                        }}>
                          <AlertCircle size={12} /> Chưa có món
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '1rem',
                        fontSize: '0.875rem',
                        background: statusStyle.bg,
                        color: statusStyle.color
                      }}>
                        {order.tinhTrang}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleViewDetail(order.id_donHang)}
                          className="btn btn-outline"
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={14} /> Chi tiết
                        </button>
                        {order.tinhTrang === 'Đang chờ món' && (
                          <button onClick={() => handleUpdateStatus(order.id_donHang, 'Đang chế biến')} className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ChefHat size={14} /> Chế biến
                          </button>
                        )}
                        {order.tinhTrang === 'Đang chế biến' && (
                          <button onClick={() => handleUpdateStatus(order.id_donHang, 'Đã phục vụ')} className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', background: '#a855f7', borderColor: '#a855f7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Truck size={14} /> Phục vụ
                          </button>
                        )}
                        {order.tinhTrang === 'Đã phục vụ' && (
                          <button onClick={() => handleUpdateStatus(order.id_donHang, 'Đã thanh toán')} className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', background: '#10b981', borderColor: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={14} /> Thu tiền
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {hasActiveFilters ? 'Không có đơn hàng phù hợp với bộ lọc.' : 'Chưa có đơn hàng nào.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ===== MODAL CHI TIẾT ĐƠN HÀNG ===== */}
      {showModal && (
        <div
          onClick={handleCloseModal}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
            }}
          >
            {/* Header modal */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--surface-light)'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
                Chi Tiết Đơn Hàng {selectedOrder ? `#DH${selectedOrder.id_donHang}` : ''}
              </h2>
              <button
                onClick={handleCloseModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Body modal */}
            <div style={{ overflowY: 'auto', padding: '1.5rem', flex: 1 }}>
              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
                  Đang tải chi tiết...
                </div>
              ) : selectedOrder ? (
                <>
                  {/* Thông tin tổng quan */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    {/* Khách hàng */}
                    <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#6366f1' }}>
                        <User size={16} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Khách hàng</span>
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>
                        {selectedOrder.tenKhachHang || `Khách #${selectedOrder.id_nguoiDung}`}
                      </div>
                    </div>

                    {/* Nhân viên phục vụ */}
                    <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#a855f7' }}>
                        <Star size={16} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nhân viên phục vụ</span>
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>
                        {selectedOrder.tenNhanVienPhucVu || (
                          <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontStyle: 'italic' }}>Chưa phân công</span>
                        )}
                      </div>
                    </div>

                    {/* Thời gian */}
                    <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'var(--surface-light)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Thời gian tạo đơn</div>
                      <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{formatDateTime(selectedOrder.thoiGianTao)}</div>
                      {selectedOrder.thoiGianDen && (
                        <>
                          <div style={{ fontSize: '0.8rem', color: '#ea580c', marginBottom: '0.25rem' }}>Giờ khách đến (đặt trước)</div>
                          <div style={{ fontWeight: 'bold', color: '#ea580c' }}>{formatDateTime(selectedOrder.thoiGianDen)}</div>
                        </>
                      )}
                    </div>

                    {/* Bàn */}
                    <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'var(--surface-light)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Bàn số</div>
                      <div style={{ fontWeight: 'bold' }}>Bàn {selectedOrder.id_ban || '-'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem', marginBottom: '0.25rem' }}>Trạng thái</div>
                      <span style={{
                        padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.85rem',
                        background: getStatusColor(selectedOrder.tinhTrang).bg,
                        color: getStatusColor(selectedOrder.tinhTrang).color,
                        fontWeight: 600
                      }}>
                        {selectedOrder.tinhTrang}
                      </span>
                    </div>
                  </div>

                  {/* Danh sách món */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <UtensilsCrossed size={18} style={{ color: '#f97316' }} />
                      Danh sách món ăn
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {selectedOrder.chi_tiet && selectedOrder.chi_tiet.length > 0 ? (
                        selectedOrder.chi_tiet.map((item) => (
                          <div key={item.id_chiTietDonHang} style={{
                            display: 'grid',
                            gridTemplateColumns: 'auto 1fr auto',
                            gap: '1rem',
                            alignItems: 'center',
                            padding: '1rem',
                            borderRadius: '0.75rem',
                            background: 'var(--surface-light)',
                            border: '1px solid var(--border)'
                          }}>
                            <div style={{ width: '52px', height: '52px', borderRadius: '0.5rem', overflow: 'hidden', background: 'var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {item.hinhAnhMon ? (
                                <img src={`${BASE_URL}${item.hinhAnhMon}`} alt={item.tenMon} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                              ) : (
                                <span style={{ fontSize: '1.5rem' }}>🍽</span>
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                {item.tenMon || `Món #${item.id_monAn}`}
                              </div>
                              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  SL: <strong style={{ color: 'var(--text)' }}>{item.soLuong}</strong>
                                </span>
                                <span style={{ fontSize: '0.8rem' }}>
                                  TT: <strong style={{ color: getMonStatusColor(item.trangThaiMon) }}>{item.trangThaiMon}</strong>
                                </span>
                              </div>
                              <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                                <ChefHat size={13} style={{ color: '#f97316' }} />
                                <span style={{ color: 'var(--text-muted)' }}>Người chế biến:</span>
                                <strong style={{ color: item.tenNhanVienBep ? '#f97316' : 'var(--text-muted)', fontStyle: item.tenNhanVienBep ? 'normal' : 'italic' }}>
                                  {item.tenNhanVienBep || 'Chưa phân công'}
                                </strong>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: 'bold', color: '#f97316', fontSize: '0.95rem' }}>
                                {formatCurrency(item.giaTaiThoiDiemBan * item.soLuong)}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {formatCurrency(item.giaTaiThoiDiemBan)} × {item.soLuong}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>Không có món nào.</div>
                      )}
                    </div>
                  </div>

                  {/* Tổng tiền & thanh toán */}
                  {(() => {
                    const orderTotal = Number(selectedOrder.tongTien || 0);
                    const daCoc = selectedOrder.trangThaiCoc === 'Đã cọc' ? Number(selectedOrder.tienCoc || 0) : 0;
                    const daThanhToan = Math.max(daCoc, Number(selectedOrder.tongThanhToan || 0));
                    const tienThua = Math.max(0, daThanhToan - orderTotal);
                    const conLai = Math.max(0, orderTotal - daThanhToan);
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem 1.25rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(234,179,8,0.08))', border: '1px solid rgba(249,115,22,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Tổng hóa đơn</span>
                          <span style={{ fontWeight: 'bold', fontSize: '1.4rem', color: '#f97316' }}>
                            {formatCurrency(orderTotal)}
                          </span>
                        </div>
                        <div style={{ height: '1px', background: 'rgba(249,115,22,0.2)' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Khách đã trả{daCoc > 0 ? ' (gồm cọc)' : ''}:</span>
                          <strong style={{ color: '#10b981' }}>{formatCurrency(daThanhToan)}</strong>
                        </div>
                        {tienThua > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.85rem', borderRadius: '0.6rem', background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.4)' }}>
                            <span style={{ fontSize: '0.9rem', color: '#f97316', fontWeight: '700' }}>⚠ Tiền thừa cần trả lại:</span>
                            <strong style={{ fontSize: '1rem', color: '#f97316' }}>{formatCurrency(tienThua)}</strong>
                          </div>
                        )}
                        {conLai > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Còn cần thu:</span>
                            <strong style={{ color: '#f87171' }}>{formatCurrency(conLai)}</strong>
                          </div>
                        )}
                        {tienThua === 0 && conLai === 0 && daThanhToan > 0 && (
                          <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: '600', textAlign: 'right' }}>
                            ✓ Đã thanh toán đủ
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
