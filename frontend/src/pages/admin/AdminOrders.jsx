import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChefHat, Truck, CheckCircle, Eye, X, User, UtensilsCrossed, Star } from 'lucide-react';

const BASE_URL = 'http://localhost:8000';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

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
      case 'Đang chờ món': return { bg: 'rgba(234, 179, 8, 0.1)', color: '#eab308' };
      case 'Đang chế biến': return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' };
      case 'Đã phục vụ': return { bg: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' };
      case 'Đã thanh toán': return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
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

  return (
    <div>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Cập nhật đơn hàng</h1>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải dữ liệu...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-light)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Mã Đơn</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Mã Khách</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Mã Bàn</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Tổng Tiền</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Trạng Thái</th>
                <th style={{ padding: '1rem', fontWeight: 'bold', textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => {
                const statusStyle = getStatusColor(order.tinhTrang);
                return (
                  <tr key={order.id_donHang} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>#DH{order.id_donHang}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>KH{order.id_nguoiDung}</td>
                    <td style={{ padding: '1rem' }}>Bàn {order.id_ban || '-'}</td>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                      {formatCurrency(order.tongTien || 0)}
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
                        {/* Nút xem chi tiết */}
                        <button
                          onClick={() => handleViewDetail(order.id_donHang)}
                          className="btn btn-outline"
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={14} /> Chi tiết
                        </button>

                        {/* Nút chuyển trạng thái */}
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
              {orders.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có đơn hàng nào.</td>
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
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
                    marginBottom: '1.5rem'
                  }}>
                    {/* Khách hàng */}
                    <div style={{
                      padding: '1rem', borderRadius: '0.75rem',
                      background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#6366f1' }}>
                        <User size={16} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Khách hàng</span>
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>
                        {selectedOrder.tenKhachHang || `Khách #${selectedOrder.id_nguoiDung}`}
                      </div>
                    </div>

                    {/* Nhân viên phục vụ */}
                    <div style={{
                      padding: '1rem', borderRadius: '0.75rem',
                      background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)'
                    }}>
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

                    {/* Bàn */}
                    <div style={{
                      padding: '1rem', borderRadius: '0.75rem',
                      background: 'var(--surface-light)', border: '1px solid var(--border)'
                    }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Bàn số</div>
                      <div style={{ fontWeight: 'bold' }}>Bàn {selectedOrder.id_ban || '-'}</div>
                    </div>

                    {/* Trạng thái */}
                    <div style={{
                      padding: '1rem', borderRadius: '0.75rem',
                      background: 'var(--surface-light)', border: '1px solid var(--border)'
                    }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Trạng thái</div>
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
                            {/* Ảnh món */}
                            <div style={{
                              width: '52px', height: '52px', borderRadius: '0.5rem', overflow: 'hidden',
                              background: 'var(--border)', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              {item.hinhAnhMon ? (
                                <img
                                  src={`${BASE_URL}${item.hinhAnhMon}`}
                                  alt={item.tenMon}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={e => { e.target.style.display = 'none'; }}
                                />
                              ) : (
                                <span style={{ fontSize: '1.5rem' }}>🍽️</span>
                              )}
                            </div>

                            {/* Tên món + nhân viên bếp */}
                            <div>
                              <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                {item.tenMon || `Món #${item.id_monAn}`}
                              </div>
                              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  SL: <strong style={{ color: 'var(--text)' }}>{item.soLuong}</strong>
                                </span>
                                <span style={{ fontSize: '0.8rem' }}>
                                  Trạng thái: <strong style={{ color: getMonStatusColor(item.trangThaiMon) }}>{item.trangThaiMon}</strong>
                                </span>
                              </div>
                              {/* Người chế biến */}
                              <div style={{
                                marginTop: '0.4rem',
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                fontSize: '0.8rem'
                              }}>
                                <ChefHat size={13} style={{ color: '#f97316' }} />
                                <span style={{ color: 'var(--text-muted)' }}>Người chế biến:</span>
                                <strong style={{
                                  color: item.tenNhanVienBep ? '#f97316' : 'var(--text-muted)',
                                  fontStyle: item.tenNhanVienBep ? 'normal' : 'italic'
                                }}>
                                  {item.tenNhanVienBep || 'Chưa phân công'}
                                </strong>
                              </div>
                            </div>

                            {/* Giá */}
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

                  {/* Tổng tiền */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '1rem 1.25rem',
                    borderRadius: '0.75rem',
                    background: 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(234,179,8,0.08))',
                    border: '1px solid rgba(249,115,22,0.3)'
                  }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Tổng tiền</span>
                    <span style={{ fontWeight: 'bold', fontSize: '1.4rem', color: '#f97316' }}>
                      {formatCurrency(selectedOrder.tongTien)}
                    </span>
                  </div>
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
