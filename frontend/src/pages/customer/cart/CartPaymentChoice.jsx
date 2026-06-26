import React from 'react';

const CartPaymentChoice = ({
    pendingPayload,
    tables,
    isSubmitting,
    payingMode,
    initiatePayment,
    onBack
}) => {
    // Lấy tiền cọc thực của bàn đã chọn
    const tableId = pendingPayload.dat_ban?.id_ban || pendingPayload.id_ban || null;
    const selectedTableData = tableId ? tables.find(t => t.id_ban === Number(tableId)) : null;
    const TABLE_FEE = selectedTableData?.tienCocMacDinh ?? 50000;
    const billTotal = pendingPayload.cart.reduce((s, i) => s + i.giaTaiThoiDiemBan * i.soLuong, 0);
    const depositAmt = Math.ceil(billTotal * 0.1) + TABLE_FEE;  // 10% bill + phí giữ bàn
    const fullAmt = Math.ceil(billTotal);                        // 100% bill, miễn phí giữ bàn

    return (
        <div style={{ maxWidth: '620px', margin: '0 auto' }}>
            {/* Tiêu đề */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '72px', height: '72px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0066cc, #004fa3)',
                    boxShadow: '0 0 0 14px rgba(0,102,204,0.1)',
                    fontSize: '2rem', marginBottom: '1.25rem', color: '#fff',
                }}>💳</div>
                <h1 style={{ fontSize: '1.85rem', fontWeight: '800', marginBottom: '0.5rem' }}>
                    Xác nhận thanh toán
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                    Chọn hình thức thanh toán để hoàn tất đặt bàn &amp; đặt món.
                    <br />Bàn chỉ được giữ sau khi thanh toán thành công.
                </p>
            </div>

            {/* Tóm tắt hóa đơn */}
            <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: '700' }}>Chi tiết hóa đơn</h3>
                <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
                    {pendingPayload.cart.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                            <span>× {item.soLuong}</span>
                            <span style={{ flex: 1, paddingLeft: '0.75rem' }}>{item.tenMon || `Món #${item.id_monAn}`}</span>
                            <strong>{(item.giaTaiThoiDiemBan * item.soLuong).toLocaleString('vi-VN')} ₫</strong>
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Tổng món ăn</span>
                        <strong>{Math.ceil(billTotal).toLocaleString('vi-VN')} ₫</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        <span>Phí giữ bàn <em>(chỉ áp dụng khi đặt cọc)</em></span>
                        <span>{TABLE_FEE.toLocaleString('vi-VN')} ₫</span>
                    </div>
                </div>
            </div>

            {/* Cảnh báo */}
            <div style={{ padding: '0.85rem 1.1rem', borderRadius: '0.75rem', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#92400e', lineHeight: 1.6 }}>
                ⚠️ <strong>Bàn chỉ được xác nhận sau khi thanh toán VNPay thành công.</strong> Nếu không đến đúng giờ, tiền cọc sẽ <strong style={{ color: '#dc2626' }}>không được hoàn lại</strong>.
            </div>

            {/* Hai lựa chọn */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                {/* Đặt cọc */}
                <div style={{ padding: '1.25rem', borderRadius: '1rem', border: '2px solid rgba(202,138,4,0.5)', background: 'rgba(234,179,8,0.04)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontWeight: '800', color: '#92400e' }}>Đặt cọc trước</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        10% hóa đơn + {TABLE_FEE.toLocaleString('vi-VN')} ₫ phí bàn.<br />Trả phần còn lại khi đến ăn.
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#ca8a04' }}>
                        {depositAmt.toLocaleString('vi-VN')} ₫
                    </div>
                    <button
                        disabled={isSubmitting}
                        onClick={() => initiatePayment('đặt cọc')}
                        style={{
                            padding: '0.65rem', borderRadius: '0.65rem', border: 'none',
                            background: payingMode === 'đặt cọc' ? '#b45309' : 'linear-gradient(135deg, #ca8a04, #92400e)',
                            color: '#fff', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem', boxShadow: '0 3px 10px rgba(202,138,4,0.3)',
                            opacity: isSubmitting && payingMode !== 'đặt cọc' ? 0.5 : 1,
                        }}
                    >
                        {payingMode === 'đặt cọc' ? 'Đang xử lý...' : 'Đặt cọc qua VNPay'}
                    </button>
                </div>

                {/* Thanh toán toàn bộ */}
                <div style={{ padding: '1.25rem', borderRadius: '1rem', border: '2px solid rgba(16,185,129,0.5)', background: 'rgba(16,185,129,0.04)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontWeight: '800', color: '#065f46' }}>Trả trước toàn bộ</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        Thanh toán 100% hóa đơn ngay.<br /><strong style={{ color: '#059669' }}>Miễn phí giữ bàn</strong>, không trả thêm khi đến.
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#059669' }}>
                        {fullAmt.toLocaleString('vi-VN')} ₫
                    </div>
                    <button
                        disabled={isSubmitting}
                        onClick={() => initiatePayment('toàn bộ')}
                        style={{
                            padding: '0.65rem', borderRadius: '0.65rem', border: 'none',
                            background: payingMode === 'toàn bộ' ? '#047857' : 'linear-gradient(135deg, #10b981, #059669)',
                            color: '#fff', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem', boxShadow: '0 3px 10px rgba(16,185,129,0.3)',
                            opacity: isSubmitting && payingMode !== 'toàn bộ' ? 0.5 : 1,
                        }}
                    >
                        {payingMode === 'toàn bộ' ? 'Đang xử lý...' : 'Thanh toán qua VNPay'}
                    </button>
                </div>
            </div>

            <div style={{ textAlign: 'center' }}>
                <button
                    onClick={onBack}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline' }}
                >
                    ← Quay lại giỏ hàng
                </button>
            </div>
        </div>
    );
};

export default CartPaymentChoice;
