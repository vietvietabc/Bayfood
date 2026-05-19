import React from 'react';
import { X, Star } from 'lucide-react';

const ReviewModal = ({
    showReviewModal,
    setShowReviewModal,
    reviewForm,
    setReviewForm,
    isSubmittingReview,
    handleSubmittingReview,
}) => {
    if (!showReviewModal) return null;

    return (
        <div
            onClick={() => setShowReviewModal(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{ background: 'var(--surface)', borderRadius: '1rem', border: '1px solid var(--border)', width: '100%', maxWidth: '450px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)', overflow: 'hidden' }}
            >
                {/* Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-light)' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
                        Đánh Giá Đơn Hàng #{reviewForm.id_donHang}
                    </h2>
                    <button onClick={() => setShowReviewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={22} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmittingReview} style={{ padding: '1.5rem', display: 'grid', gap: '1.25rem' }}>
                    {/* Số sao */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text)' }}>
                            Số sao đánh giá
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    type="button"
                                    key={star}
                                    onClick={() => setReviewForm({ ...reviewForm, soSao: star })}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: star <= reviewForm.soSao ? '#eab308' : 'var(--border)' }}
                                >
                                    <Star size={32} fill={star <= reviewForm.soSao ? '#eab308' : 'none'} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bình luận */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text)' }}>
                            Bình luận / Ý kiến đóng góp
                        </label>
                        <textarea
                            className="input-field"
                            placeholder="Chia sẻ trải nghiệm của bạn về món ăn và dịch vụ..."
                            rows={4}
                            value={reviewForm.noiDung}
                            onChange={(e) => setReviewForm({ ...reviewForm, noiDung: e.target.value })}
                            required
                            style={{ width: '100%', resize: 'none', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--surface-light)', color: 'var(--text)' }}
                        />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                        <button type="button" className="btn btn-outline" onClick={() => setShowReviewModal(false)}>Hủy</button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmittingReview}
                            style={{ background: '#eab308', color: '#000', borderColor: '#eab308' }}
                        >
                            {isSubmittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReviewModal;
