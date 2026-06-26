import React from 'react';
import { fmtMoney } from './WaiterConstants';

// ============================================================
// WaiterCheckout.jsx - Modal tính tiền & thu ngân cho phục vụ
// ============================================================

const WaiterCheckout = ({ checkoutOrder, checkoutDetails, checkoutLoading, onClose, onPrintReceipt, onComplete }) => {
    if (!checkoutOrder) return null;

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-card)', borderRadius: 'var(--rounded-lg)', border: '1px solid var(--hairline)', width: '100%', maxWidth: '520px', maxHeight: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column', padding: '1.5rem', boxShadow: '0 25px 60px rgba(0,0,0,0.4)', color: 'var(--ink)' }}>

                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--hairline)', paddingBottom: '0.75rem', flexShrink: 0 }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Tính tiền & Thu ngân
                    </h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        &times;
                    </button>
                </div>

                {/* Scrollable Content Body */}
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem', marginBottom: '1rem' }}>
                    {checkoutLoading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                            <div style={{ width: '36px', height: '36px', border: '3px solid var(--hairline)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                            Đang tải chi tiết hóa đơn...
                        </div>
                    ) : checkoutDetails ? (
                        <div>
                            {/* Table & Customer Summary */}
                            <div style={{ background: 'var(--surface-soft)', border: '1px solid var(--hairline)', padding: '1rem', borderRadius: 'var(--rounded-lg)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                    <span style={{ color: 'var(--muted)' }}>Bàn ăn:</span>
                                    <strong style={{ color: 'var(--ink)' }}>{checkoutDetails.id_ban ? `Bàn ${checkoutDetails.id_ban}` : 'Mang về'}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                    <span style={{ color: 'var(--muted)' }}>Đơn hàng:</span>
                                    <strong style={{ color: 'var(--ink)' }}>#{checkoutDetails.id_donHang}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--muted)' }}>Khách hàng:</span>
                                    <strong style={{ color: 'var(--ink)' }}>{checkoutDetails.tenKhachHang || 'Vãng lai'}</strong>
                                </div>
                            </div>

                            {/* Ordered Items List */}
                            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.75rem' }}>Món ăn đã phục vụ</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                {checkoutDetails.chi_tiet && checkoutDetails.chi_tiet.length > 0 ? (
                                    checkoutDetails.chi_tiet.map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-soft)', border: '1px solid var(--hairline)', padding: '0.6rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.85rem' }}>
                                            <span>{item.tenMon || `Món #${item.id_monAn}`} <strong style={{ color: 'var(--muted)' }}>x{item.soLuong}</strong></span>
                                            <strong style={{ color: 'var(--ink)' }}>{fmtMoney(item.giaTaiThoiDiemBan * item.soLuong)}</strong>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ color: 'var(--muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>Không có chi tiết món ăn.</div>
                                )}
                            </div>

                            {/* Cost Calculations */}
                            <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--muted)' }}>Tổng tiền món ăn:</span>
                                    <span>{fmtMoney(checkoutDetails.tongTien)}</span>
                                </div>

                                {checkoutDetails.trangThaiCoc === 'Đã cọc' && checkoutDetails.tienCoc > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#10b981' }}>
                                        <span>Tiền cọc (Đã thanh toán):</span>
                                        <strong>-{fmtMoney(checkoutDetails.tienCoc)}</strong>
                                    </div>
                                )}
                                {checkoutDetails.tongThanhToan > (checkoutDetails.trangThaiCoc === 'Đã cọc' ? checkoutDetails.tienCoc : 0) && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#10b981' }}>
                                        <span>Đã thanh toán bổ sung:</span>
                                        <strong>-{fmtMoney(checkoutDetails.tongThanhToan - (checkoutDetails.trangThaiCoc === 'Đã cọc' ? checkoutDetails.tienCoc : 0))}</strong>
                                    </div>
                                )}

                                {(() => {
                                    const totalPaid = Math.max(checkoutDetails.trangThaiCoc === 'Đã cọc' ? checkoutDetails.tienCoc : 0, checkoutDetails.tongThanhToan || 0);
                                    const finalAmount = Math.max(0, checkoutDetails.tongTien - totalPaid);
                                    const overpaidAmount = Math.max(0, totalPaid - checkoutDetails.tongTien);

                                    if (overpaidAmount > 0) {
                                        return (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--hairline)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                                                <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#ef4444' }}>CẦN HOÀN TIỀN MẶT:</span>
                                                <strong style={{ fontSize: '1.3rem', color: '#ef4444', textShadow: '0 0 10px rgba(239,68,68,0.2)' }}>
                                                    {fmtMoney(overpaidAmount)}
                                                </strong>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--hairline)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                                            <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>CẦN THU CỦA KHÁCH:</span>
                                            <strong style={{ fontSize: '1.3rem', color: 'var(--primary)', textShadow: '0 0 10px rgba(249,115,22,0.2)' }}>
                                                {fmtMoney(finalAmount)}
                                            </strong>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* VietQR Dynamic Code Display */}
                            {(() => {
                                const totalPaid = Math.max(checkoutDetails.trangThaiCoc === 'Đã cọc' ? checkoutDetails.tienCoc : 0, checkoutDetails.tongThanhToan || 0);
                                const finalAmount = Math.max(0, checkoutDetails.tongTien - totalPaid);
                                if (finalAmount <= 0) return null; // Ẩn QR code nếu không cần thanh toán thêm

                                const addInfo = `THANH TOAN DH${checkoutDetails.id_donHang}`;
                                return (
                                    <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'var(--surface-soft)', border: '1px solid var(--hairline)', borderRadius: 'var(--rounded-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Quét mã thanh toán VietQR
                                        </span>
                                        <div style={{ background: '#fff', padding: '0.5rem', borderRadius: 'var(--rounded-md)', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '180px', height: '180px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                            <img
                                                src={`https://img.vietqr.io/image/970419-9704198526191432198-compact.png?amount=${finalAmount}&addInfo=${encodeURIComponent(addInfo)}&accountName=NGUYEN%20VAN%20A`}
                                                alt="Mã QR chuyển khoản"
                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            />
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', textAlign: 'center', display: 'grid', gap: '0.2rem' }}>
                                            <span>Chủ tài khoản: <strong style={{ color: 'var(--ink)' }}>NGUYEN VAN A</strong></span>
                                            <span>Số tài khoản: <strong style={{ color: 'var(--ink)' }}>9704198526191432198</strong></span>
                                            <span>Ngân hàng: <strong style={{ color: 'var(--ink)' }}>NCB</strong></span>
                                            <span>Nội dung: <strong style={{ color: 'var(--primary)' }}>{addInfo}</strong></span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    ) : (
                        <div style={{ color: 'red', textAlign: 'center', padding: '1rem' }}>Lỗi tải chi tiết đơn hàng</div>
                    )}
                </div>

                {/* Sticky Modal Footer (Actions) */}
                {checkoutDetails && (
                    <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--hairline)', flexShrink: 0 }}>
                        <button onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>Hủy</button>
                        <button onClick={() => onPrintReceipt(checkoutDetails)} className="btn" style={{ flex: 1.5, background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', borderRadius: '0.5rem', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>
                            🖨️ In hóa đơn
                        </button>
                        <button onClick={() => onComplete(checkoutOrder.id_donHang)} className="btn btn-primary" style={{ flex: 2, background: 'var(--primary)', border: 'none', boxShadow: '0 4px 15px rgba(249,115,22,0.3)', fontWeight: '700' }}>
                            Đã nhận & Hoàn tất
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

export default WaiterCheckout;
