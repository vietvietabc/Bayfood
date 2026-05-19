import React from 'react';
import { X } from 'lucide-react';
import { formatDateTime, getStatusStyle } from './customerDashboardUtils';

const ReservationModal = ({
    showReservationModal,
    selectedReservation,
    orders,
    handleCloseReservationModal,
    setShowReservationModal,
    handleViewOrder,
}) => {
    if (!showReservationModal || !selectedReservation) return null;

    const linkedOrder = orders.find((o) => o.id_datBan === selectedReservation.id_datBan);

    return (
        <div
            onClick={handleCloseReservationModal}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{ background: 'var(--surface)', borderRadius: '1rem', border: '1px solid var(--border)', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}
            >
                {/* Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-light)' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
                        Chi Tiết Đặt Bàn #{selectedReservation.id_datBan}
                    </h2>
                    <button onClick={handleCloseReservationModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}>
                        <X size={22} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem', display: 'grid', gap: '1rem', overflowY: 'auto' }}>
                    {/* Trạng thái */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px dashed var(--border)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Trạng thái</span>
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', background: getStatusStyle(selectedReservation.trangThai).bg, color: getStatusStyle(selectedReservation.trangThai).color, fontSize: '0.875rem', fontWeight: 'bold' }}>
                            {selectedReservation.trangThai}
                        </span>
                    </div>
                    {/* Bàn */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px dashed var(--border)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Bàn</span>
                        <strong>{selectedReservation.id_ban ? `Bàn ${selectedReservation.id_ban}` : 'Chưa xếp'}</strong>
                    </div>
                    {/* Thời gian đến */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px dashed var(--border)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Thời gian đến</span>
                        <strong>{formatDateTime(selectedReservation.thoiGianDen)}</strong>
                    </div>
                    {/* Đến thực tế */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px dashed var(--border)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Đến thực tế</span>
                        <strong>{formatDateTime(selectedReservation.thoiGianDenThucTe)}</strong>
                    </div>
                    {/* Số người */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px dashed var(--border)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Số người</span>
                        <strong>{selectedReservation.soNguoi}</strong>
                    </div>
                    {/* Ghi chú */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '0.75rem', borderBottom: '1px dashed var(--border)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Ghi chú</span>
                        <div style={{ padding: '1rem', background: 'var(--surface-light)', borderRadius: '0.5rem', border: '1px solid var(--border)', minHeight: '60px' }}>
                            {selectedReservation.ghiChu || <em style={{ color: 'var(--text-muted)' }}>Không có ghi chú</em>}
                        </div>
                    </div>
                    {/* Liên kết đơn món */}
                    {linkedOrder && (
                        <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '0.75rem', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: '#2563eb', marginBottom: '0.25rem', fontWeight: 600 }}>Đã đặt món ăn đi kèm</div>
                                <div style={{ fontWeight: 'bold', color: '#2563eb' }}>Đơn hàng: #{linkedOrder.id_donHang}</div>
                            </div>
                            <button
                                className="btn btn-outline"
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: '#2563eb', borderColor: '#3b82f6' }}
                                onClick={() => {
                                    setShowReservationModal(false);
                                    handleViewOrder(linkedOrder.id_donHang);
                                }}
                            >
                                Xem đơn món
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReservationModal;
