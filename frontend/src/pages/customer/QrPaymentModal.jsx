import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { formatCurrency } from './customerDashboardUtils';

const QrPaymentModal = ({ qrModal, setQrModal, copiedField, handleCopyText }) => {
    if (!qrModal) return null;

    return createPortal(
        <div
            onClick={() => setQrModal(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{ background: 'var(--surface)', borderRadius: '1.25rem', border: '1px solid var(--border)', width: '100%', maxWidth: '480px', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', color: 'var(--text)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
                {/* Header */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-light)' }}>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', margin: 0 }}>Thanh toán qua VietQR</h2>
                    <button onClick={() => setQrModal(null)} aria-label="Đóng thanh toán" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={22} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {qrModal.label}
                    </div>

                    {/* QR Code */}
                    <div style={{ background: '#fff', padding: '1rem', borderRadius: '1rem', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '240px', height: '240px' }}>
                        <img
                            src={`https://img.vietqr.io/image/970419-9704198526191432198-compact.png?amount=${qrModal.amount}&addInfo=${encodeURIComponent(qrModal.addInfo)}&accountName=NGUYEN%20VAN%20A`}
                            alt="Mã QR Thanh Toán VietQR"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                    </div>

                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0, maxWidth: '340px' }}>
                        Mở ứng dụng ngân hàng bất kỳ, quét mã QR này để tự động điền đầy đủ số tiền &amp; nội dung chuyển khoản.
                    </p>

                    {/* Chi tiết tài khoản */}
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--surface-light)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '0.75rem', fontSize: '0.9rem' }}>
                        {/* Chủ tài khoản */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Chủ tài khoản:</span>
                            <strong style={{ color: 'var(--text)' }}>NGUYEN VAN A</strong>
                        </div>
                        {/* Số tài khoản */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border)', paddingTop: '0.6rem' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Số tài khoản:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <strong style={{ color: 'var(--text)' }}>9704198526191432198</strong>
                                <button onClick={() => handleCopyText('9704198526191432198', 'stk')} aria-label="Sao chép số tài khoản" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '0.25rem', padding: '0.15rem 0.3rem', fontSize: '0.7rem', cursor: 'pointer' }}>
                                    {copiedField === 'stk' ? ' Đã chép' : 'Sao chép'}
                                </button>
                            </div>
                        </div>
                        {/* Ngân hàng */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border)', paddingTop: '0.6rem' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ngân hàng:</span>
                            <strong style={{ color: 'var(--text)' }}>NCB (TMCP Quốc Dân)</strong>
                        </div>
                        {/* Số tiền */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border)', paddingTop: '0.6rem' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Số tiền chuyển:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <strong style={{ color: '#f97316', fontSize: '1rem' }}>{formatCurrency(qrModal.amount)}</strong>
                                <button onClick={() => handleCopyText(qrModal.amount.toString(), 'amount')} aria-label="Sao chép số tiền chuyển" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '0.25rem', padding: '0.15rem 0.3rem', fontSize: '0.7rem', cursor: 'pointer' }}>
                                    {copiedField === 'amount' ? ' Đã chép' : 'Sao chép'}
                                </button>
                            </div>
                        </div>
                        {/* Nội dung */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border)', paddingTop: '0.6rem' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nội dung chuyển:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <strong style={{ color: 'var(--text)', fontSize: '0.85rem', wordBreak: 'break-all' }}>{qrModal.addInfo}</strong>
                                <button onClick={() => handleCopyText(qrModal.addInfo, 'info')} aria-label="Sao chép nội dung chuyển" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '0.25rem', padding: '0.15rem 0.3rem', fontSize: '0.7rem', cursor: 'pointer' }}>
                                    {copiedField === 'info' ? ' Đã chép' : 'Sao chép'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '1rem 1.5rem', background: 'var(--surface-light)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => setQrModal(null)} className="btn btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', fontWeight: 'bold' }}>
                        Đã chuyển khoản xong
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default QrPaymentModal;
