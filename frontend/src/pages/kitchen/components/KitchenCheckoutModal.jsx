import React from 'react';

const KitchenCheckoutModal = ({
    showCheckoutModal,
    setShowCheckoutModal,
    isEarlyCheckout,
    shiftData,
    checkoutReason,
    setCheckoutReason,
    earlyCheckoutError,
    setEarlyCheckoutError,
    submitShiftCheckOut,
    shiftLoading
}) => {
    if (!showCheckoutModal) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--hairline)',
                borderRadius: 'var(--rounded-xl)',
                width: '100%',
                maxWidth: '480px',
                padding: '2rem',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: isEarlyCheckout ? 'rgba(239,68,68,0.1)' : 'rgba(249,115,22,0.1)',
                        color: isEarlyCheckout ? '#ef4444' : 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem'
                    }}>
                        🚪
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--ink)' }}>
                            {isEarlyCheckout ? 'Tan Ca Làm Sớm' : 'Xác Nhận Tan Ca'}
                        </h3>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                            {isEarlyCheckout ? 'Bạn đang muốn rời ca khi chưa kết thúc thời gian làm việc' : 'Xác nhận kết thúc ca làm việc của bạn'}
                        </p>
                    </div>
                </div>

                {isEarlyCheckout ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{
                            padding: '0.85rem 1rem',
                            background: 'rgba(239,68,68,0.05)',
                            border: '1px solid rgba(239,68,68,0.15)',
                            borderRadius: 'var(--rounded-md)',
                            fontSize: '0.85rem',
                            color: '#b91c1c',
                            lineHeight: '1.4'
                        }}>
                            ⚠️ <strong>Lưu ý:</strong> Ca làm việc của bạn là <strong>{shiftData?.caLamViec}</strong> (kết thúc lúc {shiftData?.caLamViec === 'Ca chiều' ? '17' : shiftData?.caLamViec === 'Ca tối' ? '24' : '12'}:00). Bạn đang tan ca sớm!
                        </div>

                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--ink)' }}>
                            Lý do tan ca sớm của bạn: <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <textarea
                            value={checkoutReason}
                            onChange={(e) => {
                                setCheckoutReason(e.target.value);
                                if (e.target.value.trim()) setEarlyCheckoutError('');
                            }}
                            placeholder="Vui lòng nhập rõ lý do tan ca sớm (ví dụ: có việc đột xuất gia đình, đã được sự đồng ý của quản lý...)"
                            style={{
                                width: '100%',
                                height: '100px',
                                padding: '0.75rem',
                                borderRadius: 'var(--rounded-md)',
                                border: earlyCheckoutError ? '1px solid #ef4444' : '1px solid var(--hairline)',
                                background: 'var(--surface-soft)',
                                color: 'var(--ink)',
                                fontSize: '0.9rem',
                                outline: 'none',
                                resize: 'none',
                                fontFamily: 'inherit',
                                transition: 'border-color 0.2s'
                            }}
                        />
                        {earlyCheckoutError && (
                            <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 'bold' }}>
                                {earlyCheckoutError}
                            </span>
                        )}
                    </div>
                ) : (
                    <div style={{ fontSize: '0.92rem', color: 'var(--muted)', lineHeight: '1.5' }}>
                        Bạn có chắc chắn muốn tan ca làm việc hiện tại không? Hệ thống sẽ ghi nhận thời điểm bạn tan ca và cập nhật trạng thái hoạt động của bạn thành <strong>Nghỉ</strong>.
                    </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                        onClick={() => setShowCheckoutModal(false)}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            borderRadius: 'var(--rounded-md)',
                            border: '1px solid var(--hairline)',
                            background: 'transparent',
                            color: 'var(--muted)',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                        }}
                    >
                        Hủy
                    </button>
                    <button
                        onClick={submitShiftCheckOut}
                        disabled={shiftLoading}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            borderRadius: 'var(--rounded-md)',
                            border: 'none',
                            background: isEarlyCheckout ? '#ef4444' : 'var(--primary)',
                            color: 'var(--ink)',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            cursor: shiftLoading ? 'not-allowed' : 'pointer',
                            boxShadow: isEarlyCheckout ? '0 4px 12px rgba(239,68,68,0.2)' : '0 4px 12px rgba(94,106,210,0.2)',
                            transition: 'opacity 0.2s'
                        }}
                    >
                        {shiftLoading ? 'Đang xử lý...' : 'Xác Nhận'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default KitchenCheckoutModal;
