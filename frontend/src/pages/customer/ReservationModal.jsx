import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CalendarDays, MapPin, Users, Clock3, StickyNote, ClipboardList } from 'lucide-react';
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
    const currentStatus = selectedReservation.trangThai;
    const statusStyle = getStatusStyle(currentStatus);

    const InfoRow = ({ icon, label, value, accent }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0', borderBottom: '1px dashed var(--border)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {icon} {label}
            </span>
            <strong style={{ color: accent || 'var(--text)', fontSize: '0.95rem' }}>{value}</strong>
        </div>
    );

    return createPortal(
        <div
            onClick={handleCloseReservationModal}
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                zIndex: 2000,
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'var(--surface)',
                    borderRadius: '1.25rem',
                    border: '1px solid var(--border)',
                    width: '100%',
                    maxWidth: '520px',
                    maxHeight: '90vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.55)',
                    animation: 'scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                }}
            >
                {/* ── Header ── */}
                <div style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--surface-light)',
                    borderRadius: '1.25rem 1.25rem 0 0',
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}>
                            <CalendarDays size={18} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                                Chi Tiết Đặt Bàn #{selectedReservation.id_datBan}
                            </h2>
                            <span style={{ padding: '0.15rem 0.6rem', borderRadius: '999px', background: statusStyle.bg, color: statusStyle.color, fontSize: '0.75rem', fontWeight: 700 }}>
                                {currentStatus}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handleCloseReservationModal}
                        aria-label="Đóng"
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid var(--border)',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            padding: '0.35rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* ── Body ── */}
                <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0', overflowY: 'auto', flex: 1 }}>
                    <InfoRow icon={<MapPin size={15} />} label="Bàn" value={selectedReservation.id_ban ? `Bàn ${selectedReservation.id_ban}` : 'Chưa xếp bàn'} accent={selectedReservation.id_ban ? '#34d399' : undefined} />
                    <InfoRow icon={<Clock3 size={15} />} label="Thời gian đến" value={formatDateTime(selectedReservation.thoiGianDen)} />
                    <InfoRow icon={<Clock3 size={15} />} label="Đến thực tế" value={formatDateTime(selectedReservation.thoiGianDenThucTe)} />
                    <InfoRow icon={<Users size={15} />} label="Số người" value={`${selectedReservation.soNguoi} người`} />

                    {/* Tiền cọc */}
                    {selectedReservation.tienCoc > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0', borderBottom: '1px dashed var(--border)' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Tiền cọc</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <strong style={{ color: selectedReservation.trangThaiCoc === 'Mất cọc' ? '#f87171' : selectedReservation.trangThaiCoc === 'Đã cọc' ? '#34d399' : '#fbbf24' }}>
                                    {Number(selectedReservation.tienCoc).toLocaleString('vi-VN')} ₫
                                </strong>
                                <span style={{
                                    padding: '0.15rem 0.55rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
                                    background: selectedReservation.trangThaiCoc === 'Mất cọc' ? 'rgba(248,113,113,0.12)' : selectedReservation.trangThaiCoc === 'Đã cọc' ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.12)',
                                    color: selectedReservation.trangThaiCoc === 'Mất cọc' ? '#f87171' : selectedReservation.trangThaiCoc === 'Đã cọc' ? '#34d399' : '#fbbf24',
                                }}>
                                    {selectedReservation.trangThaiCoc}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Ghi chú */}
                    <div style={{ padding: '0.85rem 0', borderBottom: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            <StickyNote size={15} /> Ghi chú
                        </span>
                        {selectedReservation.ghiChu ? (() => {
                            const lines = selectedReservation.ghiChu.split('\n').filter(l => l.trim());
                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    {lines.map((line, idx) => {
                                        const isMerge = line.includes('[GHÉP BÀN]');
                                        return isMerge ? (
                                            <div key={idx} style={{ padding: '0.6rem 0.85rem', background: 'rgba(124,58,237,0.08)', borderRadius: '0.6rem', border: '1px solid rgba(124,58,237,0.25)', fontSize: '0.875rem', color: '#a78bfa', fontWeight: 600, display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                                                <span style={{ fontSize: '1rem', lineHeight: 1.2, flexShrink: 0 }}>🪑</span>
                                                <span>{line.replace('[GHÉP BÀN]', '').trim()}</span>
                                            </div>
                                        ) : (
                                            <div key={idx} style={{ padding: '0.6rem 0.85rem', background: 'var(--surface-light)', borderRadius: '0.6rem', border: '1px solid var(--border)', fontSize: '0.9rem' }}>
                                                {line}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })() : (
                            <div style={{ padding: '0.75rem 1rem', background: 'var(--surface-light)', borderRadius: '0.6rem', border: '1px solid var(--border)', fontSize: '0.9rem', minHeight: '50px' }}>
                                <em style={{ color: 'var(--text-muted)' }}>Không có ghi chú</em>
                            </div>
                        )}
                    </div>

                    {/* Lý do hủy */}
                    {selectedReservation.lyDoHuy && (
                        <div style={{ padding: '0.85rem 1rem', marginTop: '0.5rem', borderRadius: '0.75rem', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.18)', fontSize: '0.88rem', color: '#f87171', fontStyle: 'italic' }}>
                            Lý do hủy: {selectedReservation.lyDoHuy}
                        </div>
                    )}

                    {/* Thông tin hoàn tiền khi Đã hủy và có cọc */}
                    {currentStatus === 'Đã hủy' && selectedReservation.tienCoc > 0 && (() => {
                        const deposit = Number(selectedReservation.tienCoc || 0);
                        const billTotal = linkedOrder
                            ? Number(linkedOrder.tongTien || 0)
                            : 0;
                        const isPaidFull = billTotal > 0 && deposit >= billTotal * 0.85;
                        const penaltyAmt = isPaidFull
                            ? Math.ceil(billTotal * 0.1) + 50000
                            : deposit;
                        const refundAmt = isPaidFull ? Math.max(0, deposit - penaltyAmt) : 0;
                        const depositLost = !isPaidFull;

                        return (
                            <div style={{
                                marginTop: '0.75rem', padding: '1rem', borderRadius: '0.85rem',
                                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                                display: 'flex', flexDirection: 'column', gap: '0.5rem',
                            }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.1rem' }}>
                                    Thông tin hoàn tiền
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Tiền cọc đã đặt</span>
                                    <strong style={{ color: '#fbbf24' }}>{deposit.toLocaleString('vi-VN')} ₫</strong>
                                </div>
                                {selectedReservation.trangThaiCoc === 'Đã cọc' ? (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Tiền phạt hủy</span>
                                            <strong style={{ color: '#f87171' }}>- {penaltyAmt.toLocaleString('vi-VN')} ₫</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', paddingTop: '0.4rem', borderTop: '1px dashed rgba(239,68,68,0.25)', fontWeight: 700 }}>
                                            <span style={{ color: refundAmt > 0 ? '#34d399' : '#f87171' }}>
                                                {refundAmt > 0 ? '↩ Số tiền hoàn lại' : '✕ Mất cọc'}
                                            </span>
                                            <span style={{ color: refundAmt > 0 ? '#34d399' : '#f87171' }}>
                                                {refundAmt > 0 ? `${refundAmt.toLocaleString('vi-VN')} ₫` : `${penaltyAmt.toLocaleString('vi-VN')} ₫`}
                                            </span>
                                        </div>
                                        {isPaidFull && refundAmt > 0 && (
                                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                (Phí giữ bàn 50.000 ₫ + 10% tổng bill — phần còn lại được hoàn lại)
                                            </div>
                                        )}
                                        {depositLost && (
                                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                (Toàn bộ tiền cọc bị giữ lại theo chính sách nhà hàng)
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                        Chưa xác nhận thanh toán cọc — liên hệ nhà hàng để được hỗ trợ.
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Linked order */}
                    {linkedOrder && (
                        <div style={{ marginTop: '0.75rem', padding: '1rem', background: 'rgba(96,165,250,0.07)', borderRadius: '0.85rem', border: '1px solid rgba(96,165,250,0.18)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ClipboardList size={16} style={{ color: '#60a5fa' }} />
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Đã đặt món đi kèm</div>
                                    <div style={{ fontWeight: 700, color: '#60a5fa' }}>Đơn #{linkedOrder.id_donHang}</div>
                                </div>
                            </div>
                            <button
                                className="btn btn-outline"
                                style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', color: '#60a5fa', borderColor: 'rgba(96,165,250,0.4)', borderRadius: '0.6rem' }}
                                onClick={() => { setShowReservationModal(false); handleViewOrder(linkedOrder.id_donHang); }}
                            >
                                Xem đơn món
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ReservationModal;
