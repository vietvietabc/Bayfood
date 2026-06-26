import React from 'react';

const CartCustomAlert = ({ customAlert, setCustomAlert }) => {
    if (!customAlert.show) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, padding: '1rem',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div className="card" style={{
                maxWidth: '420px', width: '100%',
                padding: '2rem',
                border: '1px solid var(--alert-border)',
                background: 'var(--alert-bg)',
                boxShadow: 'var(--alert-shadow)',
                borderRadius: '1rem',
                textAlign: 'center',
                transform: 'scale(1)',
                animation: 'scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
                <div style={{
                    width: '56px', height: '56px',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1.25rem auto',
                    background: customAlert.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : customAlert.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(249, 115, 22, 0.12)',
                    color: customAlert.type === 'success' ? '#10b981' : customAlert.type === 'error' ? '#ef4444' : '#fb923c',
                    border: `1px solid ${customAlert.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : customAlert.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(249, 115, 22, 0.2)'}`
                }}>
                    {customAlert.type === 'success' ? (
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                    ) : customAlert.type === 'error' ? (
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                    ) : (
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.084 1.085l-.041.02H11.25zm0 5.25h.008v.008H11.25V16.5zm-9-4.5a9 9 0 1118 0 9 9 0 01-18 0z" />
                        </svg>
                    )}
                </div>

                <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: 'var(--text-main)',
                    marginBottom: '0.75rem'
                }}>
                    {customAlert.type === 'success' ? 'Thành công' : customAlert.type === 'error' ? 'Có lỗi xảy ra' : 'Thông báo'}
                </h3>

                <p style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.925rem',
                    lineHeight: '1.5',
                    marginBottom: '1.75rem',
                    whiteSpace: 'pre-line'
                }}>
                    {customAlert.message}
                </p>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {customAlert.showCancel && (
                        <button
                            onClick={() => setCustomAlert({ show: false, message: '', type: 'info', onClose: null, showCancel: false })}
                            className="btn"
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                letterSpacing: '0.025em',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                color: '#fff',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                        >
                            Hủy
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (customAlert.onClose) customAlert.onClose();
                            setCustomAlert({ show: false, message: '', type: 'info', onClose: null, showCancel: false });
                        }}
                        className="btn"
                        style={{
                            flex: customAlert.showCancel ? 1 : 'none',
                            width: customAlert.showCancel ? 'auto' : '100%',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            letterSpacing: '0.025em',
                            background: customAlert.type === 'success' ? '#10b981' : customAlert.type === 'error' ? '#ef4444' : '#f97316',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'opacity 0.2s',
                            boxShadow: `0 4px 12px ${customAlert.type === 'success' ? 'rgba(16,185,129,0.3)' : customAlert.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(249,115,22,0.3)'}`
                        }}
                    >
                        Đồng ý
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CartCustomAlert;
