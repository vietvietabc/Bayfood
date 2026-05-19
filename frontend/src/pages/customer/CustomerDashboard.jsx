import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ClipboardList, Clock3, LogIn, MapPin, UtensilsCrossed, UserCircle2, MapPinned, CheckCheck, Eye, Star, Edit3 } from 'lucide-react';
import useCustomerDashboard from './useCustomerDashboard';
import { formatDateTime, getStatusStyle } from './customerDashboardUtils';
import OrderModal from './OrderModal';
import ReservationModal from './ReservationModal';
import ReviewModal from './ReviewModal';
import QrPaymentModal from './QrPaymentModal';

const CustomerDashboard = () => {
    const ctx = useCustomerDashboard();
    const {
        user, authLoading, loading, error,
        reservations, orders, reviews,
        activeReservations, activeOrders,
        checkinLoadingId, actionMessage, checkinToast,
        handleCheckin, handleCheckinOrder,
        selectedOrder, orderDetailLoading, showOrderModal,
        handleViewOrder, handleCloseOrderModal, handleEditOrder,
        selectedReservation, showReservationModal,
        handleViewReservation, handleCloseReservationModal,
        showReviewModal, setShowReviewModal, reviewForm, setReviewForm, isSubmittingReview,
        handleSubmittingReview,
        qrModal, setQrModal, copiedField, handleCopyText, handleVNPayPayment,
        setShowOrderModal, setSelectedReservation, setShowReservationModal,
    } = ctx;

    if (authLoading || (loading && user)) {
        return (
            <div className="container py-16">
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <div style={{ width: '42px', height: '42px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }}></div>
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Đang tải khu vực khách hàng...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="container py-16">
                <div className="card" style={{ padding: '3rem', textAlign: 'center', maxWidth: '720px', margin: '0 auto' }}>
                    <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)', marginBottom: '1rem' }}>
                        <UserCircle2 size={32} />
                    </div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>Khu vực khách hàng</h1>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Đăng nhập để xem đơn hàng, đặt bàn và thông tin tài khoản của bạn.</p>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <LogIn size={18} /> Đăng nhập
                        </Link>
                        <Link to="/register" className="btn btn-outline">Đăng ký tài khoản</Link>
                        <Link to="/menu" className="btn btn-outline">Xem thực đơn</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-8">
            {/* Toast */}
            {checkinToast && (
                <div style={{ position: 'fixed', right: '1.25rem', bottom: '1.25rem', zIndex: 120, maxWidth: '360px', padding: '0.95rem 1rem', borderRadius: '0.9rem', background: 'rgba(249, 115, 22, 0.96)', color: 'white', boxShadow: '0 18px 45px rgba(0,0,0,0.22)', fontWeight: 'bold' }}>
                    {checkinToast}
                </div>
            )}

            {/* Lỗi */}
            {error && <div style={{ padding: '1rem', marginBottom: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--danger)', background: 'rgba(239,68,68,0.08)', color: 'var(--danger)' }}>{error}</div>}

            {/* Thông báo action */}
            {actionMessage && <div style={{ padding: '1rem', marginBottom: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--primary)', background: 'rgba(249,115,22,0.08)', color: 'var(--text)' }}>{actionMessage}</div>}

            {/* Hero */}
            <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(255,247,237,0.8))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '999px', background: 'rgba(255,255,255,0.7)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                            <UserCircle2 size={16} /> Khu vực khách hàng
                        </div>
                        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Xin chào, {user.hoTen}</h1>
                        <p style={{ color: 'var(--text-muted)', maxWidth: '720px' }}>Đây là nơi bạn xem nhanh các đặt bàn, đơn món và trạng thái xử lý hiện tại.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <Link to="/menu" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}><UtensilsCrossed size={18} /> Đặt món</Link>
                        <Link to="/reservation" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}><CalendarDays size={18} /> Đặt bàn</Link>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6" style={{ marginBottom: '1.5rem' }}>
                <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'var(--primary)' }}><ClipboardList size={22} /><strong>Đơn món</strong></div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{orders.length}</div>
                    <div style={{ color: 'var(--text-muted)' }}>{activeOrders} đơn đang xử lý</div>
                </div>
                <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: '#2563eb' }}><MapPin size={22} /><strong>Đặt bàn</strong></div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{reservations.length}</div>
                    <div style={{ color: 'var(--text-muted)' }}>{activeReservations} đang chờ hoặc đã xác nhận</div>
                </div>
                <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: '#059669' }}><Clock3 size={22} /><strong>Tài khoản</strong></div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{user.tenVaiTro || 'Khách hàng'}</div>
                    <div style={{ color: 'var(--text-muted)' }}>{user.soDienThoai || 'Chưa cập nhật số điện thoại'}</div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-2 gap-6" style={{ alignItems: 'start' }}>
                {/* Đặt bàn */}
                <section className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Lịch sử đặt bàn</h2>
                            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Tất cả các lượt đặt bàn của bạn.</p>
                        </div>
                        <Link to="/reservation" style={{ color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'none' }}>Đặt thêm</Link>
                    </div>

                    {reservations.length === 0 ? (
                        <div style={{ padding: '1.25rem', borderRadius: '0.75rem', background: 'var(--surface-light)', color: 'var(--text-muted)' }}>Bạn chưa có lịch sử đặt bàn nào.</div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '520px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                            {reservations.map((reservation) => {
                                const statusStyle = getStatusStyle(reservation.trangThai);
                                return (
                                    <div key={reservation.id_datBan} style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--surface-light)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                            <strong>#{reservation.id_datBan} - Bàn {reservation.id_ban || 'Chưa chọn'}</strong>
                                            <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', background: statusStyle.bg, color: statusStyle.color, fontSize: '0.875rem' }}>{reservation.trangThai}</span>
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', display: 'grid', gap: '0.25rem' }}>
                                            <span>Thời gian: {formatDateTime(reservation.thoiGianDen)}</span>
                                            <span>Đến thực tế: {formatDateTime(reservation.thoiGianDenThucTe)}</span>
                                            <span>Số người: {reservation.soNguoi}</span>
                                            {reservation.ghiChu && <span>Ghi chú: {reservation.ghiChu}</span>}
                                            {reservation.tienCoc > 0 && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                                                    Tiền cọc:
                                                    <strong style={{ color: reservation.trangThaiCoc === 'Mất cọc' ? '#dc2626' : reservation.trangThaiCoc === 'Đã cọc' ? '#059669' : '#ca8a04' }}>
                                                        {Number(reservation.tienCoc).toLocaleString('vi-VN')} ₫
                                                    </strong>
                                                    <span style={{ padding: '0.1rem 0.45rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '700', background: reservation.trangThaiCoc === 'Mất cọc' ? 'rgba(239,68,68,0.12)' : reservation.trangThaiCoc === 'Đã cọc' ? 'rgba(16,185,129,0.12)' : 'rgba(234,179,8,0.12)', color: reservation.trangThaiCoc === 'Mất cọc' ? '#dc2626' : reservation.trangThaiCoc === 'Đã cọc' ? '#059669' : '#ca8a04' }}>
                                                        {reservation.trangThaiCoc}
                                                    </span>
                                                </span>
                                            )}
                                            {reservation.lyDoHuy && <span style={{ color: '#dc2626', fontSize: '0.875rem', fontStyle: 'italic' }}>Lý do: {reservation.lyDoHuy}</span>}
                                            {orders.some((o) => o.id_datBan === reservation.id_datBan) && (
                                                <span style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '0.2rem' }}>Đã đặt món đi kèm</span>
                                            )}
                                            {reservation.soPhutGiuChoConLai !== undefined && reservation.soPhutGiuChoConLai !== null && reservation.soPhutGiuChoConLai > 0 && (
                                                <span style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '0.2rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <Clock3 size={14} /> Thời gian giữ chỗ còn lại: {reservation.soPhutGiuChoConLai} phút
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ marginTop: '0.9rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                            {reservation.tienCoc > 0 && reservation.trangThaiCoc !== 'Đã cọc' && reservation.trangThaiCoc !== 'Mất cọc' && reservation.trangThai !== 'Đã hủy' && reservation.trangThai !== 'Vắng mặt' && (
                                                <>
                                                    <button onClick={() => handleVNPayPayment('datban', reservation.id_datBan, reservation.tienCoc)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', background: 'linear-gradient(135deg, #0066cc, #004fa3)', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}>
                                                        VNPay ({Number(reservation.tienCoc).toLocaleString('vi-VN')} ₫)
                                                    </button>
                                                    <button onClick={() => setQrModal({ amount: reservation.tienCoc, addInfo: `DAT BAN DB${reservation.id_datBan}`, label: `Thanh toán cọc đặt bàn #${reservation.id_datBan}` })} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}>
                                                        VietQR ({Number(reservation.tienCoc).toLocaleString('vi-VN')} ₫)
                                                    </button>
                                                </>
                                            )}
                                            <button className="btn btn-outline" onClick={() => handleViewReservation(reservation)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Eye size={16} /> Xem chi tiết
                                            </button>
                                            {reservation.trangThai === 'Đã xác nhận' && (
                                                <button type="button" onClick={() => handleCheckin(reservation.id_datBan)} disabled={checkinLoadingId === reservation.id_datBan} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem' }}>
                                                    <MapPinned size={16} />
                                                    {checkinLoadingId === reservation.id_datBan ? 'Đang check-in...' : 'Tôi đã tới bàn'}
                                                </button>
                                            )}
                                        </div>

                                        {reservation.trangThai === 'Chờ xác nhận' && <div style={{ marginTop: '0.9rem', padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(234,179,8,0.08)', color: '#ca8a04', fontSize: '0.875rem', fontWeight: 'bold' }}>Bàn đang chờ admin xác nhận, chưa thể check-in.</div>}
                                        {reservation.trangThai === 'Đã đặt' && <div style={{ marginTop: '0.9rem', padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(59,130,246,0.08)', color: '#2563eb', fontSize: '0.875rem', fontWeight: 'bold' }}>Bàn đã được đặt, chờ admin xác nhận trước khi check-in.</div>}
                                        {reservation.trangThai === 'Đã checkin' && <div style={{ marginTop: '0.9rem', padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(124,58,237,0.08)', color: '#7c3aed', fontSize: '0.875rem', fontWeight: 'bold' }}>Đã check-in, admin đã được thông báo.</div>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* Đơn món */}
                <section className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Lịch sử đặt món</h2>
                            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Xem lại tất cả đơn món và trạng thái xử lý.</p>
                        </div>
                        <Link to="/cart" style={{ color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'none' }}>Xem giỏ hàng</Link>
                    </div>

                    {orders.length === 0 ? (
                        <div style={{ padding: '1.25rem', borderRadius: '0.75rem', background: 'var(--surface-light)', color: 'var(--text-muted)' }}>Bạn chưa có lịch sử đặt món nào.</div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '520px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                            {orders.map((order) => {
                                const statusStyle = getStatusStyle(order.tinhTrang);
                                const linkedRes = reservations.find((r) => r.id_datBan === order.id_datBan);
                                const depositAmount = linkedRes && linkedRes.tienCoc > 0 ? Number(linkedRes.tienCoc || 0) : 0;
                                const hasPaidDeposit = linkedRes && linkedRes.trangThaiCoc === 'Đã cọc';
                                const remainingAmount = Math.max(0, Number(order.tongTien || 0) - (hasPaidDeposit ? depositAmount : 0));

                                return (
                                    <div key={order.id_donHang} style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--surface-light)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                            <strong>#{order.id_donHang}</strong>
                                            <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', background: statusStyle.bg, color: statusStyle.color, fontSize: '0.875rem' }}>{order.tinhTrang}</span>
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', display: 'grid', gap: '0.25rem' }}>
                                            <span>Thời gian tạo: {formatDateTime(order.thoiGianTao)}</span>
                                            <span>Bàn: {order.id_ban ? `Bàn ${order.id_ban}` : order.id_datBan ? 'Đã đặt bàn (chờ xếp chỗ)' : 'Chưa đặt bàn'}</span>
                                            {order.thoiGianDen && <span>Thời gian tới: {formatDateTime(order.thoiGianDen)}</span>}
                                            {order.id_datBan && <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.9rem' }}>Đã đặt kèm bàn #{order.id_datBan}</span>}

                                            <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '0.5rem', marginTop: '0.5rem', display: 'grid', gap: '0.15rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Tổng hóa đơn món ăn:</span>
                                                    <strong>{Number(order.tongTien).toLocaleString('vi-VN')} ₫</strong>
                                                </div>
                                                {depositAmount > 0 && (
                                                    <>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: hasPaidDeposit ? '#10b981' : '#ca8a04' }}>
                                                            <span>Tiền cọc {hasPaidDeposit ? '(Đã thanh toán)' : '(Chờ thanh toán)'}:</span>
                                                            <strong>-{depositAmount.toLocaleString('vi-VN')} ₫</strong>
                                                        </div>
                                                        {hasPaidDeposit && (
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f97316', fontWeight: 'bold' }}>
                                                                <span>Còn lại cần trả tại nhà hàng:</span>
                                                                <strong>{remainingAmount.toLocaleString('vi-VN')} ₫</strong>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ marginTop: '0.9rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                            <button className="btn btn-outline" onClick={() => handleViewOrder(order.id_donHang)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Eye size={16} /> Xem chi tiết
                                            </button>
                                            {(order.tinhTrang === 'Đang chờ món' || order.tinhTrang === 'Chờ khách đến') && (
                                                <button className="btn btn-primary" onClick={() => handleEditOrder(order)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <Edit3 size={16} /> Chỉnh sửa
                                                </button>
                                            )}
                                            {order.tinhTrang === 'Chờ khách đến' && !order.id_datBan && (
                                                <button className="btn" onClick={() => handleCheckinOrder(order.id_donHang)} disabled={checkinLoadingId === order.id_donHang} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#10b981', color: '#fff', border: 'none' }}>
                                                    <CheckCheck size={16} /> {checkinLoadingId === order.id_donHang ? 'Đang xử lý...' : 'Báo đã tới'}
                                                </button>
                                            )}
                                            {order.tinhTrang === 'Đã thanh toán' && (() => {
                                                const hasReview = reviews.some((r) => r.id_donHang === order.id_donHang);
                                                if (hasReview) {
                                                    const review = reviews.find((r) => r.id_donHang === order.id_donHang);
                                                    return <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 1rem', fontSize: '0.875rem', color: '#10b981', background: 'rgba(16,185,129,0.08)', borderRadius: '0.5rem', fontWeight: 'bold' }}><Star size={16} fill="#10b981" /> Đã đánh giá ({review.soSao}★)</div>;
                                                }
                                                return (
                                                    <button className="btn" onClick={() => { setReviewForm({ id_donHang: order.id_donHang, soSao: 5, noiDung: '' }); setShowReviewModal(true); }} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#eab308', color: '#000', border: 'none', fontWeight: 'bold' }}>
                                                        <Star size={16} /> Đánh giá
                                                    </button>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            {/* Modals */}
            <OrderModal
                showOrderModal={showOrderModal}
                orderDetailLoading={orderDetailLoading}
                selectedOrder={selectedOrder}
                reservations={reservations}
                handleCloseOrderModal={handleCloseOrderModal}
                setShowOrderModal={setShowOrderModal}
                setSelectedReservation={setSelectedReservation}
                setShowReservationModal={setShowReservationModal}
                reviews={reviews}
                showReviewModal={showReviewModal}
                setShowReviewModal={setShowReviewModal}
                reviewForm={reviewForm}
                setReviewForm={setReviewForm}
            />
            <ReservationModal
                showReservationModal={showReservationModal}
                selectedReservation={selectedReservation}
                orders={orders}
                handleCloseReservationModal={handleCloseReservationModal}
                setShowReservationModal={setShowReservationModal}
                handleViewOrder={handleViewOrder}
            />
            <ReviewModal
                showReviewModal={showReviewModal}
                setShowReviewModal={setShowReviewModal}
                reviewForm={reviewForm}
                setReviewForm={setReviewForm}
                isSubmittingReview={isSubmittingReview}
                handleSubmittingReview={handleSubmittingReview}
            />
            <QrPaymentModal
                qrModal={qrModal}
                setQrModal={setQrModal}
                copiedField={copiedField}
                handleCopyText={handleCopyText}
            />
        </div>
    );
};

export default CustomerDashboard;
