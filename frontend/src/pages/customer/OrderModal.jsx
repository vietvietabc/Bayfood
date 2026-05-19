import React from 'react';
import { X, Star, UtensilsCrossed } from 'lucide-react';
import { BASE_URL, formatDateTime, formatCurrency, getStatusStyle, getMonStatusColor } from './customerDashboardUtils';

const OrderModal = ({
    showOrderModal,
    orderDetailLoading,
    selectedOrder,
    reservations,
    handleCloseOrderModal,
    handleEditOrder,
    setShowOrderModal,
    setSelectedReservation,
    setShowReservationModal,
    showReviewModal,
    setShowReviewModal,
    reviewForm,
    setReviewForm,
    reviews,
}) => {
    if (!showOrderModal) return null;

    return (
        <div
            onClick={handleCloseOrderModal}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{ background: 'var(--surface)', borderRadius: '1rem', border: '1px solid var(--border)', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}
            >
                {/* Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-light)' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
                        Chi Tiết Đơn Hàng {selectedOrder ? `#DH${selectedOrder.id_donHang}` : ''}
                    </h2>
                    <button onClick={handleCloseOrderModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}>
                        <X size={22} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ overflowY: 'auto', padding: '1.5rem', flex: 1 }}>
                    {orderDetailLoading ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Đang tải chi tiết...</div>
                    ) : selectedOrder ? (
                        <>
                            {/* Nhân viên & Trạng thái */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#a855f7' }}>
                                        <Star size={16} /><span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Nhân viên phục vụ</span>
                                    </div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>
                                        {selectedOrder.tenNhanVienPhucVu || <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontStyle: 'italic' }}>Chưa phân công</span>}
                                    </div>
                                </div>
                                <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'var(--surface-light)', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Trạng thái</div>
                                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.85rem', background: getStatusStyle(selectedOrder.tinhTrang).bg, color: getStatusStyle(selectedOrder.tinhTrang).color, fontWeight: 600 }}>
                                        {selectedOrder.tinhTrang}
                                    </span>
                                </div>
                            </div>

                            {/* Bàn + Thời gian tạo */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ padding: '1rem', borderRadius: '0.75rem', background: selectedOrder.id_ban ? 'rgba(16,185,129,0.12)' : 'var(--surface-light)', border: `1px solid ${selectedOrder.id_ban ? 'rgba(16,185,129,0.4)' : 'var(--border)'}` }}>
                                    <div style={{ fontSize: '0.8rem', color: selectedOrder.id_ban ? '#059669' : 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 700 }}>
                                        🪑 BÀN NGỒI
                                    </div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.4rem', color: selectedOrder.id_ban ? '#059669' : 'var(--text-muted)' }}>
                                        {selectedOrder.id_ban ? `Bàn số ${selectedOrder.id_ban}` : selectedOrder.id_datBan ? 'Đã đặt bàn (chờ xếp chỗ)' : 'Chưa đặt bàn'}
                                    </div>
                                </div>
                                <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'var(--surface-light)', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Thời gian tạo đơn</div>
                                    <div style={{ fontWeight: 'bold' }}>{formatDateTime(selectedOrder.thoiGianTao)}</div>
                                </div>
                            </div>

                            {/* Thời gian dự kiến tới */}
                            {selectedOrder.thoiGianDen && (
                                <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(249, 115, 22, 0.08)', border: '1px solid rgba(249, 115, 22, 0.2)', marginBottom: '1.5rem' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '0.25rem', fontWeight: 600 }}>🕐 Thời gian dự kiến tới</div>
                                    <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{formatDateTime(selectedOrder.thoiGianDen)}</div>
                                </div>
                            )}

                            {/* Liên kết đặt bàn */}
                            {selectedOrder.id_datBan && (
                                <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: '#059669', marginBottom: '0.25rem', fontWeight: 600 }}>Đã liên kết lịch đặt bàn</div>
                                        <div style={{ fontWeight: 'bold', color: '#059669' }}>Mã đặt bàn: #{selectedOrder.id_datBan}</div>
                                    </div>
                                    <button
                                        className="btn btn-outline"
                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: '#059669', borderColor: '#10b981' }}
                                        onClick={() => {
                                            setShowOrderModal(false);
                                            const res = reservations.find((r) => r.id_datBan === selectedOrder.id_datBan);
                                            if (res) {
                                                setSelectedReservation(res);
                                                setShowReservationModal(true);
                                            } else {
                                                alert('Không tìm thấy thông tin chi tiết đặt bàn!');
                                            }
                                        }}
                                    >
                                        Xem chi tiết đặt bàn
                                    </button>
                                </div>
                            )}

                            {/* Danh sách món */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <UtensilsCrossed size={18} style={{ color: '#f97316' }} />Danh sách món ăn
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {selectedOrder.chi_tiet && selectedOrder.chi_tiet.length > 0
                                        ? selectedOrder.chi_tiet.map((item) => (
                                            <div key={item.id_chiTietDonHang} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '1rem', alignItems: 'center', padding: '1rem', borderRadius: '0.75rem', background: 'var(--surface-light)', border: '1px solid var(--border)' }}>
                                                <div style={{ width: '52px', height: '52px', borderRadius: '0.5rem', overflow: 'hidden', background: 'var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {item.hinhAnhMon
                                                        ? <img src={`${BASE_URL}${item.hinhAnhMon}`} alt={item.tenMon} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                                                        : <span style={{ fontSize: '1.5rem' }}></span>}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{item.tenMon || `Món #${item.id_monAn}`}</div>
                                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SL: <strong style={{ color: 'var(--text)' }}>{item.soLuong}</strong></span>
                                                        <span style={{ fontSize: '0.8rem' }}>Trạng thái: <strong style={{ color: getMonStatusColor(item.trangThaiMon) }}>{item.trangThaiMon}</strong></span>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                    <div style={{ fontWeight: 'bold', color: '#f97316', fontSize: '0.95rem' }}>{formatCurrency(item.giaTaiThoiDiemBan * item.soLuong)}</div>
                                                </div>
                                            </div>
                                        ))
                                        : <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>Không có món nào.</div>}
                                </div>
                            </div>

                            {/* Tổng tiền */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(234,179,8,0.08))', border: '1px solid rgba(249,115,22,0.3)' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Tổng tiền</span>
                                <span style={{ fontWeight: 'bold', fontSize: '1.4rem', color: '#f97316' }}>{formatCurrency(selectedOrder.tongTien)}</span>
                            </div>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default OrderModal;
