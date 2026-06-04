import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Star, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { BASE_URL } from './customerDashboardUtils';

const ReviewModal = ({
    showReviewModal,
    setShowReviewModal,
    reviewForm, // Initial state, contains { id_donHang: ... }
    setReviewForm,
    isSubmittingReview,
    handleSubmittingReview, // Note: We might manage submission locally to avoid rewriting useCustomerDashboard too much
    orders,
    reviews
}) => {
    // Determine which order we are looking at
    const order = orders?.find(o => o.id_donHang === reviewForm.id_donHang);
    
    // Local state for the specific form being submitted
    const [localReview, setLocalReview] = useState({ id_monAn: null, soSao: 5, noiDung: '' });
    const [submitting, setSubmitting] = useState(false);
    const [localReviews, setLocalReviews] = useState(reviews || []);

    // Sync reviews when props change
    React.useEffect(() => {
        setLocalReviews(reviews || []);
    }, [reviews]);

    if (!showReviewModal || !order) return null;

    // Helper: find existing review
    const getReviewFor = (id_monAn) => {
        return localReviews.find(r => r.id_donHang === order.id_donHang && r.id_monAn === id_monAn);
    };

    // Deduplicate dishes so we don't show the same dish multiple times if ordered multiple units
    const uniqueDishes = [];
    if (order.chi_tiet) {
        order.chi_tiet.forEach(item => {
            if (!uniqueDishes.find(d => d.id_monAn === item.id_monAn)) {
                uniqueDishes.push(item);
            }
        });
    }

    const overallReview = getReviewFor(null);

    const handleLocalSubmit = async (e, id_monAn) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                id_donHang: order.id_donHang,
                id_monAn: id_monAn,
                soSao: localReview.soSao,
                noiDung: localReview.noiDung
            };
            const res = await axios.post(`${BASE_URL}/api/danhgia/`, payload);
            setLocalReviews([res.data, ...localReviews]);
            setLocalReview({ id_monAn: null, soSao: 5, noiDung: '' });
            alert('Cảm ơn bạn đã gửi đánh giá!');
            // To sync back to parent if needed, you could call a parent fetch or refresh here
        } catch (err) {
            console.error('Lỗi khi gửi đánh giá:', err);
            alert(err.response?.data?.detail || 'Không thể gửi đánh giá lúc này.');
        } finally {
            setSubmitting(false);
        }
    };

    return createPortal(
        <div
            onClick={() => setShowReviewModal(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{ background: 'var(--surface)', borderRadius: '1rem', border: '1px solid var(--border)', width: '100%', maxWidth: '550px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.5)', overflow: 'hidden' }}
            >
                {/* Header */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-light)' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
                        Đánh Giá Đơn Hàng #{order.id_donHang}
                    </h2>
                    <button onClick={() => setShowReviewModal(false)} aria-label="Đóng đánh giá" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={22} />
                    </button>
                </div>

                {/* Content area: Scrollable */}
                <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'grid', gap: '1.5rem' }}>
                    
                    {/* Overall Review Section */}
                    <div style={{ border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem', background: 'var(--surface-light)' }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text)' }}>Đánh giá tổng thể đơn hàng</h3>
                        
                        {overallReview ? (
                            <div style={{ background: 'rgba(52,211,153,0.05)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(52,211,153,0.2)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <CheckCircle size={18} color="#10b981" />
                                    <span style={{ fontWeight: 'bold', color: '#10b981' }}>Đã đánh giá ({overallReview.soSao}★)</span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem' }}>
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <Star key={star} size={16} fill={star <= overallReview.soSao ? '#eab308' : 'none'} color={star <= overallReview.soSao ? '#eab308' : 'var(--border)'} />
                                    ))}
                                </div>
                                {overallReview.noiDung && <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>"{overallReview.noiDung}"</p>}
                            </div>
                        ) : (
                            <form onSubmit={(e) => handleLocalSubmit(e, null)} style={{ display: 'grid', gap: '1rem' }}>
                                <div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                type="button"
                                                key={star}
                                                onClick={() => setLocalReview({ ...localReview, soSao: star })}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', color: star <= localReview.soSao && localReview.id_monAn === null ? '#eab308' : 'var(--border)' }}
                                            >
                                                <Star size={28} fill={star <= localReview.soSao && localReview.id_monAn === null ? '#eab308' : 'none'} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <textarea
                                    className="input-field"
                                    placeholder="Chia sẻ trải nghiệm tổng thể của bạn..."
                                    rows={3}
                                    value={localReview.id_monAn === null ? localReview.noiDung : ''}
                                    onChange={(e) => setLocalReview({ id_monAn: null, soSao: localReview.id_monAn === null ? localReview.soSao : 5, noiDung: e.target.value })}
                                    required
                                    style={{ width: '100%', resize: 'none', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button type="submit" className="btn btn-primary" disabled={submitting || localReview.id_monAn !== null} style={{ background: '#eab308', color: '#000', borderColor: '#eab308', padding: '0.4rem 1rem', fontSize: '0.875rem' }}>
                                        {submitting && localReview.id_monAn === null ? 'Đang gửi...' : 'Gửi đánh giá chung'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Individual Dishes Section */}
                    {uniqueDishes.length > 0 && (
                        <div>
                            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Đánh giá từng món ăn</h3>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {uniqueDishes.map((item) => {
                                    const dishReview = getReviewFor(item.id_monAn);
                                    const isEditingThis = localReview.id_monAn === item.id_monAn;
                                    return (
                                        <div key={item.id_monAn} style={{ border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ width: '50px', height: '50px', borderRadius: '0.35rem', overflow: 'hidden', background: 'var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {item.hinhAnhMon ? (
                                                        <img src={item.hinhAnhMon.startsWith('http') ? item.hinhAnhMon : `${BASE_URL}${item.hinhAnhMon.startsWith('/') ? '' : '/'}${item.hinhAnhMon}`} alt={item.tenMon} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                                                    ) : null}
                                                    <span style={{ fontSize: '1.2rem', display: item.hinhAnhMon ? 'none' : 'block' }}>🍽️</span>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 'bold' }}>{item.tenMon || `Món #${item.id_monAn}`}</div>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{Number(item.giaTaiThoiDiemBan).toLocaleString('vi-VN')} ₫</div>
                                                </div>
                                            </div>

                                            {dishReview ? (
                                                <div style={{ background: 'rgba(52,211,153,0.05)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(52,211,153,0.2)' }}>
                                                    <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem' }}>
                                                        {[1, 2, 3, 4, 5].map(star => (
                                                            <Star key={star} size={14} fill={star <= dishReview.soSao ? '#eab308' : 'none'} color={star <= dishReview.soSao ? '#eab308' : 'var(--border)'} />
                                                        ))}
                                                    </div>
                                                    {dishReview.noiDung && <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>"{dishReview.noiDung}"</p>}
                                                </div>
                                            ) : (
                                                <form onSubmit={(e) => handleLocalSubmit(e, item.id_monAn)} style={{ display: 'grid', gap: '0.75rem', marginTop: '0.25rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <button
                                                                type="button"
                                                                key={star}
                                                                onClick={() => setLocalReview({ id_monAn: item.id_monAn, soSao: star, noiDung: isEditingThis ? localReview.noiDung : '' })}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', color: star <= localReview.soSao && isEditingThis ? '#eab308' : 'var(--border)' }}
                                                            >
                                                                <Star size={24} fill={star <= localReview.soSao && isEditingThis ? '#eab308' : 'none'} />
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {isEditingThis && (
                                                        <>
                                                            <textarea
                                                                className="input-field"
                                                                placeholder={`Cảm nhận của bạn về món ${item.tenMon}...`}
                                                                rows={2}
                                                                value={localReview.noiDung}
                                                                onChange={(e) => setLocalReview({ ...localReview, noiDung: e.target.value })}
                                                                required
                                                                style={{ width: '100%', resize: 'none', padding: '0.6rem', fontSize: '0.9rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--surface-light)', color: 'var(--text)' }}
                                                            />
                                                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ background: '#eab308', color: '#000', borderColor: '#eab308', padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}>
                                                                    {submitting ? 'Đang gửi...' : 'Gửi đánh giá món'}
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </form>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--surface-light)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-outline" onClick={() => setShowReviewModal(false)}>Đóng lại</button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ReviewModal;
