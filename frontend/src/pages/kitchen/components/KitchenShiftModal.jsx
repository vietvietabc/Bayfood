import React from 'react';
import { formatTime } from './KitchenConstants';

const KitchenShiftModal = ({
    showShiftModal,
    setShowShiftModal,
    shiftData,
    user,
    handleShiftCheckIn,
    shiftLoading
}) => {
    if (!showShiftModal) return null;

    return (
        <div onClick={() => setShowShiftModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-card)', borderRadius: 'var(--rounded-lg)', border: '1px solid var(--hairline)', width: '100%', maxWidth: '440px', boxShadow: '0 25px 60px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-soft)' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>Xác Nhận Vào Ca Làm</h2>
                    <button onClick={() => setShowShiftModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.2rem' }}>✕</button>
                </div>
                <div style={{ padding: '1.5rem' }}>
                    {!shiftData?.caLamViec ? (
                        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>⚠️</div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 0.5rem', color: '#dc2626' }}>Chưa được gán ca làm việc!</h3>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)', lineHeight: '1.5' }}>
                                Bạn chưa được Quản lý phân chia ca làm việc trong hệ thống.<br />
                                Vui lòng liên hệ Quản lý để được xếp lịch ca làm việc trước khi thực hiện nhận ca.
                            </p>
                            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowShiftModal(false)} style={{ padding: '0.5rem 1.5rem' }}>Đóng</button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', color: 'var(--ink)', lineHeight: '1.5' }}>
                                Hệ thống sẽ thực hiện kiểm tra và check-in vào ca làm việc được gán bởi Quản lý cho tài khoản của bạn:
                            </p>

                            <div style={{
                                padding: '1.25rem',
                                borderRadius: 'var(--rounded-md)',
                                border: '1px solid var(--hairline)',
                                background: 'var(--surface-soft)',
                                marginBottom: '1.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Đầu bếp:</span>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{user.hoTen}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Ca làm được gán:</span>
                                    <span style={{
                                        fontSize: '0.9rem',
                                        fontWeight: 'bold',
                                        color: '#2563eb',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.35rem'
                                    }}>
                                        {shiftData.caLamViec === 'Ca sáng' ? ' Ca sáng' : shiftData.caLamViec === 'Ca chiều' ? ' Ca chiều' : ' Ca tối'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Khung giờ ca:</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                                        {shiftData.caLamViec === 'Ca sáng' ? '07:00 - 12:00' : shiftData.caLamViec === 'Ca chiều' ? '12:00 - 17:00' : '17:00 - 22:00'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--hairline)', paddingTop: '0.75rem' }}>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Giờ hiện tại:</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#10b981' }}>{formatTime(new Date())}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowShiftModal(false)} style={{ padding: '0.5rem 1.25rem' }}>Hủy</button>
                                <button
                                    type="button"
                                    onClick={handleShiftCheckIn}
                                    disabled={shiftLoading}
                                    className="btn btn-primary"
                                    style={{ padding: '0.5rem 1.5rem', background: '#2563eb', borderColor: '#2563eb', fontWeight: 'bold' }}
                                >
                                    {shiftLoading ? 'Đang xác thực...' : 'Xác Nhận Vào Ca'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KitchenShiftModal;
